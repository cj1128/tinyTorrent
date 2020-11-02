import { log } from "./deps.ts"
import { Sha1Hash, Torrent } from "./main.ts"
import { Peer } from "./utils.ts"
import { Worker } from "./worker.ts"

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

// concurrent control
export const MAX_PENDING_REQUEST = 5
export const MAX_BLOCK_SIZE = 16 * 1024 // 16k

export interface PieceResult {
  pieceIndex: number,
  workerIndex: number,
  content: Uint8Array,
}

export interface PieceWork {
  pieceIndex: number,
  hash: Sha1Hash,
  length: number, // piece length in bytes
  ttl: number, // used for preventing forever loop
}

export class Downloader {
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

    this.peers.forEach((peer: Peer, idx: number) => {
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