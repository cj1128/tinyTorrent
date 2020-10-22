import {
  genRandomStr,
  parsePeer,
  queryEncodeArrayBuffer,
} from "../src/utils.ts"
import {
  assertEquals,
  assertThrows,
} from "./deps.ts"

const { test } = Deno

test("queryEncodeArrayBuffer", () => {
  assertEquals(queryEncodeArrayBuffer(new Uint8Array([1, 2, 3, 4])), "%01%02%03%04")
  assertEquals(queryEncodeArrayBuffer(new Uint8Array([255, 220, 199, 133])), "%ff%dc%c7%85")
})

test("genRandomStr", () => {
  assertEquals(genRandomStr(0).length, 0)
  assertEquals(genRandomStr(3).length, 3)
  assertEquals(genRandomStr(10).length, 10)
})

{
  test("parsePeer: Uint8Array must have 6 bytes", () => {
    assertThrows(() => parsePeer(new Uint8Array(1)))
  })

  test("parsePeer: return correct value", () => {
    assertEquals(parsePeer(new Uint8Array([192, 168, 1, 0, 0x10, 0x24])), {
      ip: "192.168.1.0",
      port: 0x1024,
    })
  })
}