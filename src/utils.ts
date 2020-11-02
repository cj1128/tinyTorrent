import {
  assert,
  createHash,
} from "./deps.ts"
import { MSG_ID } from "./downloader.ts"
import { Message } from "./worker.ts"

const te = new TextEncoder()

export const sha1Hash = (buf: Uint8Array): Uint8Array => {
  const hash = createHash("sha1")
  hash.update(buf)
  return new Uint8Array(hash.digest())
}

export const queryEncodeArrayBuffer = (ab: ArrayBuffer): string => [...new Uint8Array(ab)].map(b => "%" + b.toString(16).padStart(2, "0")).join("")

export const toHex = (ab: ArrayBuffer): string => [...new Uint8Array(ab)].map(b => b.toString(16).padStart(2, "0")).join("")

const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
export const genRandomStr = (length: number): string => new Array(length).fill(0).map(x => alphabet[Math.floor(Math.random() * alphabet.length)]).join("")

export const pick = <O extends object>(obj: O, keys: (keyof O)[]): object => {
  const result: Partial<O> = {}

  keys.forEach(key => {
    result[key] = obj[key]
  })

  return result
}

export interface Peer {
  ip: string,
  port: number,
}

export const parsePeer = (buf: Uint8Array): Peer => {
  assert(buf.length === 6)
  const ip = [...buf.slice(0, 4)].map(num => num.toString()).join(".")
  const dv = new DataView(buf.buffer, buf.byteOffset)
  const port = dv.getUint16(4, false)

  return {
    ip,
    port,
  }
}

const UNITS = [
  'B',
  'kB',
  'MB',
  'GB',
  'TB',
  'PB',
  'EB',
  'ZB',
  'YB'
]

export const formatBytes = (num: number): string => {
  if (!Number.isFinite(num)) {
    throw new TypeError(`Expected a finite number, got ${typeof num}: ${num}`)
  }

  const isNegative = num < 0
  const prefix = isNegative ? '-' : ''

  if (isNegative) {
    num = -num
  }

  if (num < 1) {
    return prefix + num.toString() + ' ' + UNITS[0]
  }

  const exponent = Math.min(Math.floor(Math.log(num) / Math.log(1024)), UNITS.length - 1)
  num = Number((num / Math.pow(1024, exponent)).toPrecision(3))

  const unit = UNITS[exponent]

  return prefix + num.toString() + ' ' + unit
}

export const readFull = async (r: Deno.Reader, buf: Uint8Array) => {
  assert(buf.length > 0)
  let remaining = buf.length

  while (true) {
    const b = new Uint8Array(remaining)
    const read = await r.read(b)

    // EOF
    if (read === null) {
      throw new Error(`EOF encountered`)
    }

    buf.set(b.slice(0, read), buf.length - remaining)
    remaining -= read

    if (remaining === 0) return
  }
}

export const typedArraysAreEqual = <T extends Uint8Array>(a: T, b: T): boolean => {
  if (a.byteLength !== b.byteLength) return false
  return a.every((val, i) => val === b[i])
}


export const sleep = async (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export const connectWithTimeout = (options: Deno.ConnectOptions, ms: number): Promise<Deno.Conn> => {
  return new Promise((resolve, reject) => {
    let timeout = false
    let resolved = false

    Deno.connect(options)
      .then(conn => {
        if (timeout) {
          conn.close()
          return
        }
        resolved = true
        resolve(conn)
      })
      .catch(_ => {
        // discard
      })

    setTimeout(() => {
      if (resolved) return
      timeout = true
      reject(new Error(`Operation timed out`))
    }, ms)
  })
}

export const isLocalHostIPV6 = (buf: Uint8Array): boolean => {
  if (buf.length !== 16) return false

  for (let i = 0; i < 15; i++) {
    if (buf[i] !== 0) return false
  }

  return buf[15] === 1
}

export const BitTorrent = {
  genRandomPeerID(): string {
    return genRandomStr(20)
  },

  genHandshakePayload(infoHash: Uint8Array, peerID: string): Uint8Array {
    const buf = new Deno.Buffer()
    buf.writeSync(new Uint8Array([0x13]))
    buf.writeSync(te.encode("BitTorrent protocol"))
    buf.writeSync(new Uint8Array(new Array(8).fill(0)))
    buf.writeSync(infoHash)
    buf.writeSync(te.encode(peerID))

    return buf.bytes()
  },

  parseHaveMessage(msg: Message): number {
    assert(msg.id == MSG_ID.Have)
    assert(msg.payload != null && msg.payload.length === 4)
    const dv = new DataView(msg.payload.buffer, msg.payload.byteOffset)
    return dv.getUint32(0, false)
  },

  parsePieceMessage(pieceIndex: number, totalLength: number, msg: Message): {
    content: Uint8Array,
    offset: number,
  } {
    assert(msg.id === MSG_ID.Piece)
    assert(msg.payload != null && msg.payload.length >= 8, "valid payload")

    const dv = new DataView(msg.payload.buffer, msg.payload.byteOffset)

    const parsedIndex = dv.getUint32(0, false)
    assert(parsedIndex === pieceIndex, "piece index unmatched")

    const offset = dv.getUint32(4, false)
    assert(offset <= totalLength, "invalid offset")

    const content = msg.payload.slice(8)
    assert(offset + content.length <= totalLength, `data(length ${content.length}) too long for offset ${offset} with total length ${totalLength}`)

    return {
      content,
      offset,
    }
  }
}