const fs = require("node:fs");
const path = require("node:path");

const targetDir = path.join(__dirname, "..", "engines", "stockfish");
fs.mkdirSync(targetDir, { recursive: true });

console.log("Chesstrix Stockfish helper");
console.log("");
console.log("Automatic Stockfish downloads change frequently, so this script keeps setup explicit and safe.");
console.log("1. Download Stockfish for your OS from https://stockfishchess.org/download/");
console.log("2. Place the executable here:");
console.log(`   ${targetDir}`);
console.log("3. Rename it to stockfish.exe on Windows, or stockfish on Linux/macOS.");
console.log("4. Alternatively set STOCKFISH_PATH to the full executable path before launching Chesstrix.");
console.log("");
console.log("Expected Windows path:");
console.log(`   ${path.join(targetDir, "stockfish.exe")}`);
