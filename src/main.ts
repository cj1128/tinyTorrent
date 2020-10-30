import { typedArraysAreEqual } from "../../deno-bencode/src/util.ts"
import {
  assert,
  decodeBencode,
  encodeBencode,
  ky,
  log,
} from "./deps.ts"

import {
  queryEncodeArrayBuffer,
  sha1Hash,
  pick,
  toHex,
  Peer,
  parsePeer,
  formatBytes,
  readFull,
  connectWithTimeout,
  isLocalHostIPV6,
  BitTorrent,
  sleep,
} from "./utils.ts"
import Bitfield from "./bitfield.ts"

type Sha1Hash = Uint8Array // 20 bytes

interface Torrent {
  trackerURL: string,
  length: number,
  filename: string,
  pieceCount: number,
  pieceLength: number, // the last piece may not be this length
  hashes: Sha1Hash[],
  infoHash: Sha1Hash,
  peerID: string,
}

const PORT = 1234

// concurrent control
const MAX_PENDING_REQUEST = 5
const MAX_BLOCK_SIZE = 16 * 1024 // 16k

export const MSG_ID = {
  KeepAlive: -1, // used to represent keep-alive message

  Choke: 0, // chokes the receiver
  Unchoke: 1, // unchokes the receiver
  Interested: 2, // expresses interest in receiving data
  NotInterested: 3, // expresses disinterest in receiving data
  Have: 4, // alerts the receiver that the sender has downloaded a piece
  Bitfield: 5, // encodes which pieces that the sender has downloaded
  Request: 6, // requests a block of data from the receiver
  Piece: 7, // delivers a block of data to fulfill a request
  Cancel: 8, // cancels a request
}

// We only support single file torrent
const parseTorrentFile = (filepath: string): Torrent => {
  const parsed = decodeBencode(Deno.readFileSync(filepath)) as any
  console.log(parsed)
  assert(parsed.info.length != null, "only support single file torrent")

  const trackerURL = parsed.announce
  assert(typeof trackerURL === "string", "announce must be a string")
  assert(trackerURL.startsWith("http"), "announce must be a http url")

  const infoHash = sha1Hash(encodeBencode(parsed.info))

  const totalLength = parsed.info.length
  const pieceLength = parsed.info["piece length"]
  const totalPieces = parsed.info.pieces as Uint8Array

  assert(totalPieces.length % 20 === 0, "pieces length must divide 20")
  const pieces = []
  const pieceCount = totalPieces.length / 20
  assert(pieceCount === Math.ceil(totalLength / pieceLength))

  for (let i = 0; i < pieceCount; i++) {
    pieces.push(totalPieces.slice(i * 20, i * 20 + 20))
  }

  return {
    trackerURL: parsed.announce,
    length: totalLength,
    filename: parsed.info.name,
    pieceLength,
    pieceCount,
    hashes: pieces,
    infoHash,
    peerID: BitTorrent.genRandomPeerID(),
  }
}

const fetchPeers = async (torrent: Torrent): Promise<Peer[]> => {
  log.info(`fetch peers url: ${torrent.trackerURL}`)
  log.info(`info hash: ${toHex(torrent.infoHash)}`)

  const query = {
    "info_hash": queryEncodeArrayBuffer(torrent.infoHash),
    "peer_id": torrent.peerID,
    "port": PORT,
    "uploaded": 0,
    "downloaded": 0,
    "compact": 1,
    "left": torrent.length,
  }

  const queryStr = Object.entries(query).map(([k, v]) => `${k}=${v}`).join("&")

  const res = await ky.get(torrent.trackerURL + "?" + queryStr)
  assert(res.status === 200)

  const content = decodeBencode(await res.arrayBuffer()) as any
  log.info(`peers response`)
  console.log(content)

  // ipv4
  if (content.peers as string !== "") {
    const peers = content.peers as Uint8Array
    const peersCount = peers.length / 6

    return new Array(peersCount).fill(0).map((_, i) => {
      return parsePeer(peers.slice(i * 6, i * 6 + 6))
    })
  }

  // ipv6, we only consider ::1
  const result: Peer[] = []
  const peers = content.peers6 as Uint8Array
  for (let i = 0; i < peers.length / 18; i++) {
    const content = peers.slice(i * 18, i * 18 + 18)
    const dv = new DataView(content.buffer, content.byteOffset)
    const host = content.slice(0, 16)
    const port = dv.getUint16(16, false)

    if (isLocalHostIPV6(host) && port !== PORT) {
      result.push({
        ip: "[::1]",
        port,
      })
    }
  }

  return result
}

interface PieceResult {
  pieceIndex: number,
  workerIndex: number,
  content: Uint8Array,
}

interface PieceWork {
  pieceIndex: number,
  hash: Sha1Hash,
  length: number, // piece length in bytes
  ttl: number, // used for preventing forever loop
}

class Downloader {
  doneSignal: Promise<boolean>
  _resolve: any

  torrent: Torrent

  peers: Peer[]

  // piece index
  workQueue: PieceWork[]

  result: PieceResult[] = []

  workingWorkers = 0

  constructor(torrent: Torrent, peers: Peer[]) {
    this.torrent = torrent
    this.peers = peers

    this.workQueue = new Array(this.torrent.pieceCount).fill(0).map((_, idx) => {
      return {
        pieceIndex: idx,
        hash: torrent.hashes[idx],
        length: idx < (torrent.pieceCount - 1) ? torrent.pieceLength : (torrent.length - torrent.pieceLength * (torrent.pieceCount - 1)),
        ttl: 100,
      }
    })

    this.doneSignal = new Promise((resolve) => {
      this._resolve = resolve
    })
  }

  async start() {
    log.info(`start downloading torrent`)

    const fetchWork = (): PieceWork | undefined => {
      return this.workQueue.pop()
    }

    const putBackWork = (w: PieceWork) => {
      this.workQueue.push(w)
    }

    const onResult = (r: PieceResult) => {
      this.result.push(r)

      const percent = (this.result.length / this.torrent.pieceCount * 100).toFixed(2)
      log.info(`## percent: ${percent}%, working workers: ${this.workingWorkers}`)

      if (this.result.length === this.torrent.pieceCount) {
        this._resolve(true)
      }
    }

    const onFailure = () => {
      this.workingWorkers--

      // All workers errored out
      if (this.workingWorkers === 0) {
        this._resolve(false)
      }
    }

    this.peers.forEach((peer, idx) => {
      this.workingWorkers++
      const worker = new Worker(idx, this.torrent, peer, fetchWork, putBackWork, onResult, onFailure)
      worker.start()
    })

    const start = Date.now()

    // We have to manually exit, 
    // because some Deno.connect promises may still pending
    if (await this.doneSignal) {
      const interval = ((Date.now() - start) / 1000).toFixed(2)

      const buf = new Deno.Buffer()
      this.result.sort((a, b) => a.pieceIndex - b.pieceIndex).forEach(r => {
        buf.write(r.content)
      })

      await Deno.writeFile(this.torrent.filename, buf.bytes())

      log.info(`All done, takes ${interval}s`)

      Deno.exit(0)
    } else {
      log.error(`All workers errored out`)
      Deno.exit(1)
    }
  }
}

export interface Message {
  id: number,
  payload?: Uint8Array,
}

class Worker {
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

    return {
      pieceIndex: work.pieceIndex,
      workerIndex: this.workerIndex,
      content: buf,
    }
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

const downloadTorrent = async (filepath: string) => {
  const torrent = parseTorrentFile(filepath)
  log.info("torrent file parsed")
  console.log(pick(torrent, ["trackerURL", "length", "filename", "pieceLength", "infoHash", "pieceCount"]))

  log.info(`file name: ${torrent.filename}`)
  log.info(`file size: ${formatBytes(torrent.length)}`)

  console.log(torrent.pieceLength, torrent.hashes.length)

  const peers = await fetchPeers(torrent)
  log.info(`peers fetched, total count: ${peers.length}`)

  if (peers.length === 0) {
    log.error("no peers")
    Deno.exit(1)
  }

  console.log(peers)

  const downloader = new Downloader(torrent, peers)
  downloader.start()
}

await log.setup({
  handlers: {
    workerFmt: new log.handlers.ConsoleHandler("DEBUG", {
      // args[0] should be the worker index
      formatter: logRecord => {
        return `${logRecord.levelName} [worker.${logRecord.args[0]}] ${logRecord.msg}`
      }
    }),

    console: new log.handlers.ConsoleHandler("DEBUG"),
  },

  loggers: {
    default: {
      level: "DEBUG",
      handlers: ["console"],
    },

    worker: {
      level: "DEBUG",
      handlers: ["workerFmt"],
    }
  }
})

if (Deno.args.length === 0) {
  log.error("must provide torrent file path")
  Deno.exit(1)
}

downloadTorrent(Deno.args[0])