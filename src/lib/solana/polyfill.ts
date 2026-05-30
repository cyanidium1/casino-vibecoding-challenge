// Browser polyfill: @solana/web3.js and Anchor rely on Node's Buffer, which is
// not present in the browser. Imported first by client-side Solana modules.
import { Buffer } from "buffer";

if (typeof globalThis !== "undefined" && !globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}
