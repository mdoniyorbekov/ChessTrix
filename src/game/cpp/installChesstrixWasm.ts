import type { CppChessController } from "./CppChessController";

type ModuleFactory = (options: { locateFile: (file: string) => string }) => Promise<{
  ccall: (name: string, returnType: string, argTypes: string[], args: unknown[]) => string;
}>;

declare global {
  interface Window {
    createChesstrixCppModule?: ModuleFactory;
  }
}

export async function installChesstrixWasm() {
  if (typeof window === "undefined" || window.chesstrixCppWasm) return;

  try {
    const wasmJsUrl = new URL("./wasm/chesstrix_wasm.js", import.meta.url).href;
    const wasmBinaryUrl = new URL("./wasm/chesstrix_wasm.wasm", import.meta.url).href;
    const imported = await import(/* @vite-ignore */ wasmJsUrl);
    const factory = (imported.default ?? window.createChesstrixCppModule) as ModuleFactory | undefined;
    if (!factory) return;
    const module = await factory({ locateFile: (file) => file.endsWith(".wasm") ? wasmBinaryUrl : file });
    const call = (name: string, returnType: string, argTypes: string[], args: unknown[]) => module.ccall(name, returnType, argTypes, args);

    window.chesstrixCppWasm = {
      createGame: (variant) => call("createGame", "string", ["string"], [variant]),
      loadFen: (fen) => call("loadFen", "string", ["string"], [fen]),
      reset: () => call("reset", "string", [], []),
      getFen: () => call("getFen", "string", [], []),
      getBoardJson: () => call("getBoardJson", "string", [], []),
      getLegalMoves: (square) => call("getLegalMoves", "string", ["string"], [square]),
      makeMove: (from, to, promotion) => call("makeMove", "string", ["string", "string", "string"], [from, to, promotion]),
      undo: () => call("undo", "string", [], []),
      getTurn: () => call("getTurn", "string", [], []) as "w" | "b",
      getGameStatus: () => call("getGameStatus", "string", [], []),
      getMoveHistory: () => call("getMoveHistory", "string", [], []),
      getCapturedPieces: () => call("getCapturedPieces", "string", [], []),
      getCastlingRights: () => call("getCastlingRights", "string", [], []),
      analyzeMove: (evalBefore, evalAfter, sideToMove) => call("analyzeMove", "string", ["number", "number", "string"], [evalBefore, evalAfter, sideToMove]),
      classifyMove: (centipawnLoss) => call("classifyMove", "string", ["number"], [centipawnLoss])
    };
  } catch {
    // WASM is optional during development until npm run build:wasm has produced the module.
  }
}

export type CppChessControllerType = CppChessController;
