import { Chess } from "chess.js";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const wasmJs = path.join(process.cwd(), "src", "game", "cpp", "wasm", "chesstrix_wasm.js");
const wasmBinary = path.join(process.cwd(), "src", "game", "cpp", "wasm", "chesstrix_wasm.wasm");

if (!existsSync(wasmJs) || !existsSync(wasmBinary)) {
  console.error("WASM module not found. Run npm run build:wasm before npm run test:wasm.");
  process.exit(1);
}

const imported = await import(pathToFileURL(wasmJs).href);
const factory = imported.default ?? globalThis.createChesstrixCppModule;
const module = await factory({ locateFile: (file) => file.endsWith(".wasm") ? wasmBinary : file });
const call = (name, returnType, argTypes = [], args = []) => module.ccall(name, returnType, argTypes, args);

function expect(condition, name) {
  if (!condition) throw new Error(name);
  console.log(`[PASS] ${name}`);
}

call("createGame", "string", ["string"], ["standard"]);
const chess = new Chess();

expect(JSON.parse(call("getLegalMoves", "string", ["string"], [""])).length === chess.moves().length, "C++ WASM initial move count matches chess.js");
expect(JSON.parse(call("makeMove", "string", ["string", "string", "string"], ["e2", "e4", ""])).ok === Boolean(chess.move({ from: "e2", to: "e4" })), "C++ WASM e2e4 legality matches chess.js");
expect(call("getFen", "string").split(" ").slice(0, 4).join(" ") === chess.fen().split(" ").slice(0, 4).join(" "), "C++ WASM FEN matches chess.js after e2e4");
expect(JSON.parse(call("makeMove", "string", ["string", "string", "string"], ["e2", "e5", ""])).ok === false, "C++ WASM rejects illegal move like chess.js");
