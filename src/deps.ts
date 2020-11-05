export {
  encode as encodeBencode,
  decode as decodeBencode,
} from "https://deno.land/x/bencode@v0.1.2/mod.ts"

export {
  createHash,
} from "https://deno.land/std@0.74.0/hash/mod.ts"

export {
  assert,
} from "https://deno.land/std@0.74.0/testing/asserts.ts"

// @deno-types="https://deno.land/x/ky@v0.23.0/index.d.ts"
export { default as ky } from "https://deno.land/x/ky@v0.23.0/index.js"

export * as log from "https://deno.land/std@0.74.0/log/mod.ts"
