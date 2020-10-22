import {
  assert,
  createHash,
} from "./deps.ts"

export const sha1Hash = (buf: ArrayBuffer): Uint8Array => {
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