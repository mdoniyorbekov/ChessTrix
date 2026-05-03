import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const buildDir = path.join(root, "cpp", "build");
mkdirSync(buildDir, { recursive: true });

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", ...options });
  return result.status === 0;
}

function commandExists(command) {
  const probe = process.platform === "win32" ? "where" : "which";
  return spawnSync(probe, [command], { stdio: "ignore", shell: process.platform === "win32" }).status === 0;
}

if (commandExists("cmake")) {
  if (!run("cmake", ["-S", "cpp", "-B", "cpp/build"])) process.exit(1);
  if (!run("cmake", ["--build", "cpp/build", "--target", "chesstrix_cpp_tests"])) process.exit(1);
  process.exit(0);
}

const candidates = process.platform === "win32"
  ? ["g++", "C:\\Users\\user\\Desktop\\MSYS2\\mingw64\\bin\\g++.exe", "C:\\msys64\\ucrt64\\bin\\g++.exe"]
  : ["g++", "clang++"];

const compiler = candidates.find((candidate) => commandExists(candidate) || existsSync(candidate));
if (!compiler) {
  console.error("No C++ build tool found. Install CMake or a C++20 compiler such as g++.");
  process.exit(1);
}

const sources = [
  "cpp/src/Board.cpp",
  "cpp/src/Piece.cpp",
  "cpp/src/King.cpp",
  "cpp/src/Queen.cpp",
  "cpp/src/Rook.cpp",
  "cpp/src/Bishop.cpp",
  "cpp/src/Knight.cpp",
  "cpp/src/Pawn.cpp",
  "cpp/src/Fen.cpp",
  "cpp/src/MoveGenerator.cpp",
  "cpp/src/Game.cpp",
  "cpp/src/GameAnalyzer.cpp",
  "cpp/tests/cpp_core_tests.cpp"
];

const output = path.join("cpp", "build", process.platform === "win32" ? "chesstrix_cpp_tests.exe" : "chesstrix_cpp_tests");
if (!run(compiler, ["-std=c++20", "-Icpp/include", ...sources, "-o", output])) process.exit(1);
