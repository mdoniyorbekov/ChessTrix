import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("chesstrixEngine", {
  init: () => ipcRenderer.invoke("stockfish:init"),
  isAvailable: () => ipcRenderer.invoke("stockfish:isAvailable"),
  setDifficulty: (profile: unknown) => ipcRenderer.invoke("stockfish:setDifficulty", profile),
  bestMove: (position: unknown, options: unknown) => ipcRenderer.invoke("stockfish:bestMove", position, options),
  evaluation: (position: unknown, options: unknown) => ipcRenderer.invoke("stockfish:evaluation", position, options),
  analysis: (position: unknown, options: unknown) => ipcRenderer.invoke("stockfish:analysis", position, options),
  stop: () => ipcRenderer.invoke("stockfish:stop"),
  quit: () => ipcRenderer.invoke("stockfish:quit")
});
