import {
  assert,
  decodeBencode,
  encodeBencode,
  ky,
  log,
} from "./deps.ts"

import { Downloader } from "./downloader.ts"

import {
  queryEncodeArrayBuffer,
  sha1Hash,
  pick,
  toHex,
  Peer,
  parsePeer,
  formatBytes,
  isLocalHostIPV6,
  BitTorrent,
} from "./utils.ts"

export type Sha1Hash = Uint8Array // 20 bytes

// log.debug method in standard library is very unconvenient
let enableDebugLog = false
export const logDebug = (...args: any[]) => {
  if (!enableDebugLog) return
  console.log(...args)
}

export interface Torrent {
  trackerURL: string,
  length: number,
  filename: string,
  pieceCount: number,
  pieceLength: number, // the last piece may not be this length
  hashes: Sha1Hash[],
  infoHash: Sha1Hash,
  peerID: string,
}

// We will *not* respond to any incoming messages
// This is a *leech* client used for learning BT!
const PORT = 1234

// We only support single file torrent
const parseTorrentFile = (filepath: string): Torrent => {
  const parsed = decodeBencode(Deno.readFileSync(filepath)) as any
  logDebug(parsed)
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
  assert(pieceCount === Math.ceil(totalLength / pieceLength), `expect ${Math.ceil(totalLength / pieceLength)}, got ${pieceCount}`)

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
  logDebug("peers response", content)

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

const downloadTorrent = async (filepath: string) => {
  const torrent = parseTorrentFile(filepath)
  log.info("torrent file parsed")
  logDebug(pick(torrent, ["trackerURL", "length", "filename", "pieceLength", "infoHash", "pieceCount"]))

  log.info(`file name: ${torrent.filename}`)
  log.info(`file size: ${formatBytes(torrent.length)}`)

  logDebug(torrent.pieceLength, torrent.hashes.length)

  const peers = await fetchPeers(torrent)
  log.info(`peers fetched, total count: ${peers.length}`)

  if (peers.length === 0) {
    log.error("no peers")
    Deno.exit(1)
  }

  logDebug(peers)

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

    console: new log.handlers.ConsoleHandler("INFO"),
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

if (Deno.args.includes("--debug")) {
  enableDebugLog = true
}

downloadTorrent(Deno.args[0])