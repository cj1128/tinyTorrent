# TinyTorrent

A tiny bittorrent client written for learning.

https://blog.jse.li/posts/torrent/

https://wiki.theory.org/BitTorrentSpecification

pieces: 每个 piece 20 个 bytes.

fetch peers from the first tracker

## Problems

- encoe arraybuffer to query string
- ArrayBuffer / ArrayBufferView

```
[0m[32mCheck[0m file:///Users/cj/Documents/Work/tinyTorrent/$deno$test.ts
[0m[1m[31merror[0m: [0m[1mTS6200[0m [ERROR]: Definitions of the following identifiers conflict with those in another file: CompileError, Global, Instance, LinkError, Memory, Module, RuntimeError, Table, ImportExportKind, TableKind, ValueType, ExportValue, Exports, ImportValue, ModuleImports, Imports, BufferSource, URLSearchParams, URL, MessageEvent, ErrorEvent, Worker, PerformanceEntryList, Performance, PerformanceEntry, PerformanceMark, PerformanceMeasure, ProgressEvent, CustomEvent, CloseEvent, WebSocket, BinaryType
interface Account {
[0m[31m~~~~~~~~~[0m
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m25[0m:[0m[33m1[0m

    Conflicts are in this file.
    declare namespace WebAssembly {
    [0m[36m~~~~~~~[0m
        at [0m[36masset:///lib.deno.shared_globals.d.ts[0m:[0m[33m13[0m:[0m[33m1[0m

[0m[1mTS6200[0m [ERROR]: Definitions of the following identifiers conflict with those in another file: ReadableStreamReadResult, CountQueuingStrategy, ByteLengthQueuingStrategy, WritableStream, TransformStream, BlobPart, Blob, File, FormDataEntryValue, FormData, HeadersInit, Headers, RequestInfo, RequestCache, RequestCredentials, RequestMode, RequestRedirect, ReferrerPolicy, BodyInit, RequestDestination, Request, ResponseType, Response
interface Account {
[0m[31m~~~~~~~~~[0m
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m25[0m:[0m[33m1[0m

    Conflicts are in this file.
    interface DomIterable<K, V> {
    [0m[36m~~~~~~~~~[0m
        at [0m[36masset:///lib.deno.fetch.d.ts[0m:[0m[33m8[0m:[0m[33m1[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'AbortController'.
interface AbortController {
[0m[31m          ~~~~~~~~~~~~~~~[0m
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m1939[0m:[0m[33m11[0m

    'AbortController' was also declared here.
    declare class AbortController {
    [0m[36m              ~~~~~~~~~~~~~~~[0m
        at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m193[0m:[0m[33m15[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'AbortController'.
declare var AbortController: {
[0m[31m            ~~~~~~~~~~~~~~~[0m
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m1950[0m:[0m[33m13[0m

    'AbortController' was also declared here.
    declare class AbortController {
    [0m[36m              ~~~~~~~~~~~~~~~[0m
        at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m193[0m:[0m[33m15[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'DOMException'.
interface DOMException {
[0m[31m          ~~~~~~~~~~~~[0m
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m3759[0m:[0m[33m11[0m

    'DOMException' was also declared here.
    declare class DOMException extends Error {
    [0m[36m              ~~~~~~~~~~~~[0m
        at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m8[0m:[0m[33m15[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'DOMException'.
declare var DOMException: {
[0m[31m            ~~~~~~~~~~~~[0m
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m3790[0m:[0m[33m13[0m

    'DOMException' was also declared here.
    declare class DOMException extends Error {
    [0m[36m              ~~~~~~~~~~~~[0m
        at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m8[0m:[0m[33m15[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'Event'.
interface Event {
[0m[31m          ~~~~~[0m
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m5285[0m:[0m[33m11[0m

    'Event' was also declared here.
    declare class Event {
    [0m[36m              ~~~~~[0m
        at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m21[0m:[0m[33m15[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'Event'.
declare var Event: {
[0m[31m            ~~~~~[0m
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m5353[0m:[0m[33m13[0m

    'Event' was also declared here.
    declare class Event {
    [0m[36m              ~~~~~[0m
        at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m21[0m:[0m[33m15[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'EventTarget'.
interface EventTarget {
[0m[31m          ~~~~~~~~~~~[0m
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m5410[0m:[0m[33m11[0m

    'EventTarget' was also declared here.
    declare class EventTarget {
    [0m[36m              ~~~~~~~~~~~[0m
        at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m87[0m:[0m[33m15[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'EventTarget'.
declare var EventTarget: {
[0m[31m            ~~~~~~~~~~~[0m
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m5435[0m:[0m[33m13[0m

    'EventTarget' was also declared here.
    declare class EventTarget {
    [0m[36m              ~~~~~~~~~~~[0m
        at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m87[0m:[0m[33m15[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'TextDecoder'.
interface TextDecoder extends TextDecoderCommon {
[0m[31m          ~~~~~~~~~~~[0m
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m15456[0m:[0m[33m11[0m

    'TextDecoder' was also declared here.
    declare class TextDecoder {
    [0m[36m              ~~~~~~~~~~~[0m
        at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m163[0m:[0m[33m15[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'TextDecoder'.
declare var TextDecoder: {
[0m[31m            ~~~~~~~~~~~[0m
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m15473[0m:[0m[33m13[0m

    'TextDecoder' was also declared here.
    declare class TextDecoder {
    [0m[36m              ~~~~~~~~~~~[0m
        at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m163[0m:[0m[33m15[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'TextEncoder'.
interface TextEncoder extends TextEncoderCommon {
[0m[31m          ~~~~~~~~~~~[0m
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m15504[0m:[0m[33m11[0m

    'TextEncoder' was also declared here.
    declare class TextEncoder {
    [0m[36m              ~~~~~~~~~~~[0m
        at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m179[0m:[0m[33m15[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'TextEncoder'.
declare var TextEncoder: {
[0m[31m            ~~~~~~~~~~~[0m
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m15515[0m:[0m[33m13[0m

    'TextEncoder' was also declared here.
    declare class TextEncoder {
    [0m[36m              ~~~~~~~~~~~[0m
        at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m179[0m:[0m[33m15[0m

[0m[1mTS2430[0m [ERROR]: Interface 'Window' incorrectly extends interface 'GlobalEventHandlers'.
  Types of property 'onload' are incompatible.
    Type '((this: Window, ev: Event) => any) | null' is not assignable to type '((this: GlobalEventHandlers, ev: Event) => any) | null'.
      Type '(this: Window, ev: Event) => any' is not assignable to type '(this: GlobalEventHandlers, ev: Event) => any'.
        The 'this' types of each signature are incompatible.
          Type 'GlobalEventHandlers' is missing the following properties from type 'Window': applicationCache, clientInformation, closed, customElements, and 142 more.
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m18432[0m:[0m[33m11[0m

[0m[1mTS2430[0m [ERROR]: Interface 'Window' incorrectly extends interface 'WindowEventHandlers'.
  Types of property 'onunload' are incompatible.
    Type '((this: Window, ev: Event) => any) | null' is not assignable to type '((this: WindowEventHandlers, ev: Event) => any) | null'.
      Type '(this: Window, ev: Event) => any' is not assignable to type '(this: WindowEventHandlers, ev: Event) => any'.
        The 'this' types of each signature are incompatible.
          Type 'WindowEventHandlers' is missing the following properties from type 'Window': applicationCache, clientInformation, closed, customElements, and 207 more.
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m18432[0m:[0m[33m11[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'EventListenerOrEventListenerObject'.
declare type EventListenerOrEventListenerObject = EventListener | EventListenerObject;
[0m[31m             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m18970[0m:[0m[33m14[0m

    'EventListenerOrEventListenerObject' was also declared here.
    declare type EventListenerOrEventListenerObject =
    [0m[36m             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
        at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m138[0m:[0m[33m14[0m

[0m[1mTS6200[0m [ERROR]: Definitions of the following identifiers conflict with those in another file: CompileError, Global, Instance, LinkError, Memory, Module, RuntimeError, Table, ImportExportKind, TableKind, ValueType, ExportValue, Exports, ImportValue, ModuleImports, Imports, BufferSource, URLSearchParams, URL, MessageEvent, ErrorEvent, Worker, PerformanceEntryList, Performance, PerformanceEntry, PerformanceMark, PerformanceMeasure, ProgressEvent, CustomEvent, CloseEvent, WebSocket, BinaryType
declare namespace WebAssembly {
[0m[31m~~~~~~~[0m
    at [0m[36masset:///lib.deno.shared_globals.d.ts[0m:[0m[33m13[0m:[0m[33m1[0m

    Conflicts are in this file.
    interface Account {
    [0m[36m~~~~~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m25[0m:[0m[33m1[0m

[0m[1mTS2375[0m [ERROR]: Duplicate number index signature.
  [index: number]: string;
[0m[31m  ~~~~~~~~~~~~~~~~~~~~~~~~[0m
    at [0m[36masset:///lib.deno.shared_globals.d.ts[0m:[0m[33m390[0m:[0m[33m3[0m

[0m[1mTS2717[0m [ERROR]: Subsequent property declarations must have the same type.  Property 'subtle' must be of type 'SubtleCrypto', but here has type 'null'.
  readonly subtle: null;
[0m[31m           ~~~~~~[0m
    at [0m[36masset:///lib.deno.shared_globals.d.ts[0m:[0m[33m421[0m:[0m[33m12[0m

    'subtle' was also declared here.
        readonly subtle: SubtleCrypto;
    [0m[36m             ~~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m3689[0m:[0m[33m14[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'DOMException'.
declare class DOMException extends Error {
[0m[31m              ~~~~~~~~~~~~[0m
    at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m8[0m:[0m[33m15[0m

    'DOMException' was also declared here.
    interface DOMException {
    [0m[36m          ~~~~~~~~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m3759[0m:[0m[33m11[0m    and here.
    declare var DOMException: {
    [0m[36m            ~~~~~~~~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m3790[0m:[0m[33m13[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'Event'.
declare class Event {
[0m[31m              ~~~~~[0m
    at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m21[0m:[0m[33m15[0m

    'Event' was also declared here.
    interface Event {
    [0m[36m          ~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m5285[0m:[0m[33m11[0m    and here.
    declare var Event: {
    [0m[36m            ~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m5353[0m:[0m[33m13[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'EventTarget'.
declare class EventTarget {
[0m[31m              ~~~~~~~~~~~[0m
    at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m87[0m:[0m[33m15[0m

    'EventTarget' was also declared here.
    interface EventTarget {
    [0m[36m          ~~~~~~~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m5410[0m:[0m[33m11[0m    and here.
    declare var EventTarget: {
    [0m[36m            ~~~~~~~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m5435[0m:[0m[33m13[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'EventListenerOrEventListenerObject'.
declare type EventListenerOrEventListenerObject =
[0m[31m             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
    at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m138[0m:[0m[33m14[0m

    'EventListenerOrEventListenerObject' was also declared here.
    declare type EventListenerOrEventListenerObject = EventListener | EventListenerObject;
    [0m[36m             ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m18970[0m:[0m[33m14[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'TextDecoder'.
declare class TextDecoder {
[0m[31m              ~~~~~~~~~~~[0m
    at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m163[0m:[0m[33m15[0m

    'TextDecoder' was also declared here.
    interface TextDecoder extends TextDecoderCommon {
    [0m[36m          ~~~~~~~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m15456[0m:[0m[33m11[0m    and here.
    declare var TextDecoder: {
    [0m[36m            ~~~~~~~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m15473[0m:[0m[33m13[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'TextEncoder'.
declare class TextEncoder {
[0m[31m              ~~~~~~~~~~~[0m
    at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m179[0m:[0m[33m15[0m

    'TextEncoder' was also declared here.
    interface TextEncoder extends TextEncoderCommon {
    [0m[36m          ~~~~~~~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m15504[0m:[0m[33m11[0m    and here.
    declare var TextEncoder: {
    [0m[36m            ~~~~~~~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m15515[0m:[0m[33m13[0m

[0m[1mTS2300[0m [ERROR]: Duplicate identifier 'AbortController'.
declare class AbortController {
[0m[31m              ~~~~~~~~~~~~~~~[0m
    at [0m[36masset:///lib.deno.web.d.ts[0m:[0m[33m193[0m:[0m[33m15[0m

    'AbortController' was also declared here.
    interface AbortController {
    [0m[36m          ~~~~~~~~~~~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m1939[0m:[0m[33m11[0m    and here.
    declare var AbortController: {
    [0m[36m            ~~~~~~~~~~~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m1950[0m:[0m[33m13[0m

[0m[1mTS6200[0m [ERROR]: Definitions of the following identifiers conflict with those in another file: ReadableStreamReadResult, CountQueuingStrategy, ByteLengthQueuingStrategy, WritableStream, TransformStream, BlobPart, Blob, File, FormDataEntryValue, FormData, HeadersInit, Headers, RequestInfo, RequestCache, RequestCredentials, RequestMode, RequestRedirect, ReferrerPolicy, BodyInit, RequestDestination, Request, ResponseType, Response
interface DomIterable<K, V> {
[0m[31m~~~~~~~~~[0m
    at [0m[36masset:///lib.deno.fetch.d.ts[0m:[0m[33m8[0m:[0m[33m1[0m

    Conflicts are in this file.
    interface Account {
    [0m[36m~~~~~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m25[0m:[0m[33m1[0m

[0m[1mTS2717[0m [ERROR]: Subsequent property declarations must have the same type.  Property 'byobRequest' must be of type 'ReadableStreamBYOBRequest | undefined', but here has type 'undefined'.
  readonly byobRequest: undefined;
[0m[31m           ~~~~~~~~~~~[0m
    at [0m[36masset:///lib.deno.fetch.d.ts[0m:[0m[33m81[0m:[0m[33m12[0m

    'byobRequest' was also declared here.
        readonly byobRequest: ReadableStreamBYOBRequest | undefined;
    [0m[36m             ~~~~~~~~~~~[0m
        at [0m[36masset:///lib.dom.d.ts[0m:[0m[33m12489[0m:[0m[33m14[0m

Found 29 errors.
```

- 文档不足
- Deno.connect timeout
- read/write timeout
- bitfield from left to right
- node 的生态问题：is-utf8