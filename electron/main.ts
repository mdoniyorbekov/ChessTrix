import { app, BrowserWindow, ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";
import { StockfishService } from "./stockfishService";

const stockfish = new StockfishService();

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1366,
    minHeight: 768,
    backgroundColor: "#07142C",
    title: "Chesstrix",
    icon: appIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    await win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    await win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
};

app.whenReady().then(async () => {
  app.setAppUserModelId("com.chesstrix.app");
  registerStockfishIpc();
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("before-quit", () => {
  stockfish.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function registerStockfishIpc() {
  ipcMain.handle("stockfish:init", () => stockfish.init());
  ipcMain.handle("stockfish:isAvailable", () => stockfish.isAvailable());
  ipcMain.handle("stockfish:setDifficulty", (_event, profile) => stockfish.setDifficulty(profile));
  ipcMain.handle("stockfish:bestMove", (_event, position, options) => stockfish.getBestMove(position, options));
  ipcMain.handle("stockfish:evaluation", (_event, position, options) => stockfish.getEvaluation(position, options));
  ipcMain.handle("stockfish:analysis", (_event, position, options) => stockfish.getAnalysis(position, options));
  ipcMain.handle("stockfish:stop", () => stockfish.stop());
  ipcMain.handle("stockfish:quit", () => stockfish.quit());
}

function appIconPath() {
  const candidates = [
    path.join(__dirname, "../public/app-assets/chesstrix-app-icon.ico"),
    path.join(__dirname, "../dist/app-assets/chesstrix-app-icon.ico")
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}
