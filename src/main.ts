import { typedArraysAreEqual } from "../../deno-bencode/src/util.ts"
import {
  assert,
  decodeBencode,
  encodeBencode,
  ky,
  log,
} from "./deps.ts"

import {
  genRandomStr,
  queryEncodeArrayBuffer,
  sha1Hash,
  pick,
  toHex,
  Peer,
  parsePeer,
  formatBytes,
  readFull,
  sleep,
  connectWithTimeout,
  isLocalHostIPV6,
} from "./utils.ts"

type Sha1Hash = Uint8Array // 20 bytes

interface Torrent {
  trackerURL: string,
  length: number,
  name: string,
  pieceCount: number,
  pieceLength: number,
  pieces: Sha1Hash[],
  infoHash: Sha1Hash,
  peerID: string,
}

const PORT = 1234

const te = new TextEncoder()
const td = new TextDecoder()

const genRandomPeerID = (): string => {
  return genRandomStr(20)
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
    name: parsed.info.name,
    pieceLength,
    pieceCount,
    pieces: pieces,
    infoHash,
    peerID: genRandomPeerID(),
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
}

class Downloader {
  doneSignal: Promise<boolean>
  _resolve: any

  torrent: Torrent

  peers: Peer[]

  // piece index
  workQueue: number[]

  result: PieceResult[] = [];

  workingWorkers: number = 0;

  constructor(torrent: Torrent, peers: Peer[]) {
    this.torrent = torrent
    this.peers = peers

    this.workQueue = new Array(this.torrent.pieceCount).fill(0).map((_, idx) => idx)

    this.doneSignal = new Promise((resolve) => {
      this._resolve = resolve
    })
  }

  async start() {
    log.info(`start to download torrent`)

    const fetchWork = (): number | undefined => {
      return this.workQueue.pop()
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

    this.peers.slice(0, 10).forEach((peer, idx) => {
      this.workingWorkers++
      const worker = new Worker(idx, this.torrent, peer, fetchWork, onResult, onFailure)
      worker.start()
    })

    const start = Date.now()

    // We have to manually exit, 
    // because some Deno.connect promises may still pending
    if (await this.doneSignal) {
      const interval = ((Date.now() - start) / 1000).toFixed(2)
      log.info(`All done, takes ${interval}s`)
      Deno.exit(0)
    } else {
      log.error(`All workers errored out`)
      Deno.exit(1)
    }
  }
}

class Worker {
  peer: Peer
  torrent: Torrent
  workerIndex: number
  fetchWork: () => number | undefined
  onResult: (r: PieceResult) => void
  onFailure: () => void

  get peerStr() {
    return `${this.peer.ip}:${this.peer.port}`
  }

  constructor(index: number, torrent: Torrent, peer: Peer, fetchWork: () => number | undefined, onResult: (r: PieceResult) => void, onFailure: () => void) {
    this.workerIndex = index
    this.torrent = torrent
    this.peer = peer
    this.fetchWork = fetchWork
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
      const conn = await this.connect()
    } catch (err) {
      this.error(`could not connect to ${this.peerStr}: ${err}`)
      this.onFailure()
      return
    }

    this.info(`connection established`)

    while (true) {
      let pieceIndex = this.fetchWork()
      if (pieceIndex === undefined) return

      try {
        this.info(`start to download piece #${pieceIndex}`)
        const result = await this.download(pieceIndex)
        this.info(`piece #${pieceIndex} downloaded`)
        this.onResult(result)
      } catch (err) {
        this.error(`failed to download piece #${pieceIndex}: ${err}`)
      }
    }
  }

  async download(pieceIndex: number): Promise<PieceResult> {
    await sleep(100 + Math.floor(Math.random() * 100))
    return {
      pieceIndex: pieceIndex,
      workerIndex: this.workerIndex,
    }
  }

  async connect() {
    this.info(`start to connect to ${this.peerStr}`)
    // connect
    const conn = await connectWithTimeout({ hostname: this.peer.ip, port: this.peer.port }, 5000)

    // handshake
    this.info(`start to handshake`)
    const { infoHash, peerID } = this.torrent
    const payload = Worker.genHandshakePayload(infoHash, peerID)
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

    return conn
  }

  static genHandshakePayload(infoHash: Uint8Array, peerID: string): Uint8Array {
    const buf = new Deno.Buffer()
    buf.writeSync(new Uint8Array([0x13]))
    buf.writeSync(te.encode("BitTorrent protocol"))
    buf.writeSync(new Uint8Array(new Array(8).fill(0)))
    buf.writeSync(infoHash)
    buf.writeSync(te.encode(peerID))

    return buf.bytes()
  }
}

const downloadTorrent = async (filepath: string) => {
  const torrent = parseTorrentFile(filepath)
  log.info("torrent file parsed")
  console.log(pick(torrent, ["trackerURL", "length", "name", "pieceLength", "infoHash", "pieceCount"]))

  log.info(`file name: ${torrent.name}`)
  log.info(`file size: ${formatBytes(torrent.length)}`)

  console.log(torrent.pieceLength, torrent.pieces.length)

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