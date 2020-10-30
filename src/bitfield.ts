class Bitfield {
  buf: Uint8Array

  constructor(buf: Uint8Array) {
    this.buf = buf
  }

  hasPiece(index: number): boolean {
    const byteIndex = (index / 8) >> 0
    const offset = index % 8
    if (byteIndex < 0 || byteIndex >= this.buf.length) {
      return false
    }

    return ((this.buf[byteIndex] >> (7 - offset)) & 1) !== 0
  }

  setPiece(index: number) {
    const byteIndex = (index / 8) >> 0
    const offset = index % 8
    if (byteIndex >= 0 && byteIndex < this.buf.length) {
      this.buf[byteIndex] |= 1 << (7 - offset)
    }
  }
}

export default Bitfield