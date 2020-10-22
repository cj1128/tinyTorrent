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
} from "./utils.ts"

type Sha1Hash = Uint8Array // 20 bytes

interface Torrent {
  trackerURL: string,
  length: number,
  name: string,
  pieceLength: number,
  pieces: Sha1Hash[],
  infoHash: Sha1Hash,
}

const PORT = 1234

const genRandomPeerID = (): string => {
  return genRandomStr(20)
}

// We only support single file torrent
const parseTorrentFile = (filepath: string): Torrent => {
  const parsed = decodeBencode(Deno.readFileSync(filepath)) as any

  assert(parsed.info.length != null, "only support single file torrent")

  const infoHash = sha1Hash(encodeBencode(parsed.info))

  const totalPieces = parsed.info.pieces as Uint8Array
  const pieces = []
  {
    assert(totalPieces.length % 20 === 0, "pieces length must divide 20")
    const count = totalPieces.length / 20
    for (let i = 0; i < count; i++) {
      pieces.push(totalPieces.slice(i * 20, i * 20 + 20))
    }
  }

  return {
    trackerURL: parsed.announce,
    length: parsed.info.length,
    name: parsed.info.name,
    pieceLength: totalPieces.length,
    pieces: pieces,
    infoHash,
  }
}

const fetchPeers = async (torrent: Torrent): Promise<Peer[]> => {
  const peerID = genRandomPeerID()

  log.info(`fetch peer urls: ${torrent.trackerURL}`)
  log.info(`info hash: ${toHex(torrent.infoHash)}`)

  const query = {
    "info_hash": queryEncodeArrayBuffer(torrent.infoHash),
    "peer_id": peerID,
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
  const peers = content.peers as Uint8Array
  const peersCount = peers.length / 6


  return new Array(peersCount).fill(0).map((_, i) => {
    return parsePeer(peers.slice(i * 6, i * 6 + 6))
  })
}

const downloadTorrent = async (filepath: string) => {
  const torrent = parseTorrentFile(filepath)
  log.info("torrent file parsed")
  console.log(pick(torrent, ["trackerURL", "length", "name", "pieceLength"]))

  console.log(torrent.infoHash)

  const peers = await fetchPeers(torrent)
  log.info(`peers fetched, total count: ${peers.length}`)
  console.log(peers)
}

if (Deno.args.length === 0) {
  log.error("must provide torrent file path")
  Deno.exit(1)
}

downloadTorrent(Deno.args[0])