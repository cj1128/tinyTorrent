import Bitfield from "./bitfield.ts"
import { assert, log } from "./deps.ts"
import { MAX_BLOCK_SIZE, MAX_PENDING_REQUEST, MSG_ID, PieceResult, PieceWork } from "./downloader.ts"
import { Torrent } from "./main.ts"
import { BitTorrent, connectWithTimeout, Peer, readFull, sha1Hash, typedArraysAreEqual } from "./utils.ts"

export interface Message {
  id: number,
  payload?: Uint8Array,
}

export class Worker {
  peer: Peer
  torrent: Torrent
  workerIndex: number
  bitfield!: Bitfield
  conn!: Deno.Conn
  choked = true
  fetchWork: () => PieceWork | undefined
  putBackWork: (w: PieceWork) => void
  onResult: (r: PieceResult) => void
  onFailure: () => void

  get peerStr() {
    return `${this.peer.ip}:${this.peer.port}`
  }

  constructor(
    index: number,
    torrent: Torrent,
    peer: Peer,
    fetchWork: () => PieceWork | undefined,
    putBackWork: (w: PieceWork) => void,
    onResult: (r: PieceResult) => void,
    onFailure: () => void
  ) {
    this.workerIndex = index
    this.torrent = torrent
    this.peer = peer
    this.fetchWork = fetchWork
    this.putBackWork = putBackWork
    this.onResult = onResult
    this.onFailure = onFailure
  }

  info(msg: string) {
    const logger = log.getLogger("worker")
    logger.info(msg, this.workerIndex)
  }
  error(msg: string) {
    const logger = log.getLogger("worker")
    logger.error(msg, this.workerIndex)
  }

  async start() {
    try {
      await this.connect()
    } catch (err) {
      this.error(`could not connect to ${this.peerStr}: ${err}`)
      this.onFailure()
      return
    }

    this.info(`connection established`)

    await this.sendUnchoke()
    await this.sendInterested()

    while (true) {
      const work = this.fetchWork()
      if (work === undefined) break
      const { pieceIndex } = work

      if (!this.bitfield.hasPiece(pieceIndex)) {
        work.ttl--

        if (work.ttl <= 0) {
          throw new Error(`could not find peers that have this piece#${pieceIndex}`)
        }

        this.putBackWork(work)
      }

      try {
        this.info(`start downloading piece#${pieceIndex}`)

        const result = await this.download(work)

        this.info(`piece#${pieceIndex} downloaded`)

        this.onResult(result)
      } catch (err) {
        this.error(`failed to download piece#${pieceIndex}: ${err}`)
        this.putBackWork(work)
      }
    }

    this.conn.close()
  }

  async download(work: PieceWork): Promise<PieceResult> {
    const { pieceIndex } = work
    let downloaded = 0
    let requested = 0
    let pendingCount = 0
    let err = null
    const buf = new Uint8Array(work.length)

    while (downloaded < work.length) {
      if (err != null) {
        throw err
      }

      if (!this.choked) {
        while (pendingCount < MAX_PENDING_REQUEST && requested < work.length) {
          pendingCount++
          const blockSize = Math.min(MAX_BLOCK_SIZE, work.length - requested)

          this.sendBlockRequest(pieceIndex, requested, blockSize)
            .catch(e => {
              err = e
            })

          requested += blockSize
        }
      }

      const msg = await this.readMessage()
      switch (msg.id) {
        case MSG_ID.Unchoke: {
          this.choked = false
        } break

        case MSG_ID.Choke: {
          this.choked = true
        } break

        case MSG_ID.Have: {
          const pieceIndex = BitTorrent.parseHaveMessage(msg)
          this.bitfield.setPiece(pieceIndex)
        } break

        case MSG_ID.Piece: {
          const { content, offset } = BitTorrent.parsePieceMessage(work.pieceIndex, work.length, msg)
          downloaded += content.length
          pendingCount--
          buf.set(content, offset)
        } break

        default: {
          // ignore
        } break
      }
    }

    assert(downloaded === work.length)

    // check hash
    assert(typedArraysAreEqual(sha1Hash(buf), work.hash), "piece hash invalid")

    // send `have` message
    // we don't need to do this, because we don't upload data to peers
    // this.sendHave(work.pieceIndex)
    //   .catch(err => {
    //     // we don't care
    //   })

    return {
      pieceIndex: work.pieceIndex,
      workerIndex: this.workerIndex,
      content: buf,
    }
  }

  async sendHave(pieceIndex: number) {
    const payload = new Uint8Array(4)
    const dv = new DataView(payload.buffer)
    dv.setUint32(0, pieceIndex, false)

    await this.sendMessage({
      id: MSG_ID.Have,
      payload,
    })
  }

  async sendBlockRequest(pieceIndex: number, offset: number, blockSize: number) {
    const payload = new Uint8Array(12)
    const dv = new DataView(payload.buffer)

    dv.setUint32(0, pieceIndex)
    dv.setUint32(4, offset)
    dv.setUint32(8, blockSize)

    const msg = {
      id: MSG_ID.Request,
      payload,
    }

    await this.sendMessage(msg)
  }

  async connect() {
    this.info(`start connecting to ${this.peerStr}`)
    // connect
    const conn = await connectWithTimeout({ hostname: this.peer.ip, port: this.peer.port }, 5000)
    this.conn = conn

    // handshake
    this.info(`start handshaking`)
    const { infoHash, peerID } = this.torrent
    const payload = BitTorrent.genHandshakePayload(infoHash, peerID)
    await conn.write(payload)

    // read response
    let buf = new Uint8Array(1)
    await readFull(conn, buf)
    const protocolIDLength = buf[0]
    assert(protocolIDLength > 0)

    buf = new Uint8Array(48 + protocolIDLength)
    await readFull(conn, buf)

    const receivedInfoHash = buf.slice(protocolIDLength + 8, protocolIDLength + 8 + 20)
    if (!typedArraysAreEqual(receivedInfoHash, infoHash)) {
      throw new Error(`unmatched info hash, expected ${infoHash}, got ${receivedInfoHash}`)
    }

    // read bitfield
    const message = await this.readMessage()
    assert(message.id === MSG_ID.Bitfield && message.payload != null)
    this.bitfield = new Bitfield(message.payload)

    this.info(`bitfield fetched`)

    return conn
  }

  async readMessage(): Promise<Message> {
    let buf = new Uint8Array(4) // for length
    await readFull(this.conn, buf)

    const dv = new DataView(buf.buffer)
    const length = dv.getUint32(0, false)

    // keep-alive message
    if (length === 0) {
      return {
        id: MSG_ID.KeepAlive,
      }
    }

    buf = new Uint8Array(length)
    await readFull(this.conn, buf)

    return {
      id: buf[0] as number,
      payload: buf.slice(1),
    }
  }

  async sendMessage(message: Message) {
    const buf = new Deno.Buffer()

    {
      const tmp = new Uint8Array(4)
      const dv = new DataView(tmp.buffer)
      const length = (message.payload?.length ?? 0) + 1 // +1 for the id field
      dv.setUint32(0, length, false)
      buf.write(tmp)
    }

    buf.write(new Uint8Array([message.id]))
    if (message.payload != null) {
      buf.write(message.payload)
    }

    await this.conn.write(buf.bytes())
  }

  async sendUnchoke() {
    await this.sendMessage({
      id: MSG_ID.Unchoke,
    })
  }

  async sendInterested() {
    await this.sendMessage({
      id: MSG_ID.Interested,
    })
  }
}