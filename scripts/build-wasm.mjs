import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

function commandExists(command) {
  const probe = process.platform === "win32" ? "where" : "which";
  return spawnSync(probe, [command], { stdio: "ignore", shell: process.platform === "win32" }).status === 0;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!commandExists("emcmake")) {
  console.error("Emscripten was not found. Install/activate the Emscripten SDK so emcmake and em++ are on PATH.");
  process.exit(1);
}

if (!commandExists("cmake")) {
  console.error("CMake was not found. Emscripten builds require CMake plus emcmake.");
  process.exit(1);
}

const buildDir = path.join("cpp", "build-wasm");
const outDir = path.join("src", "game", "cpp", "wasm");
mkdirSync(buildDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

run("emcmake", ["cmake", "-S", "cpp", "-B", buildDir, "-DCMAKE_BUILD_TYPE=Release"]);
run("cmake", ["--build", buildDir, "--target", "chesstrix_wasm", "--config", "Release"]);

const jsCandidates = [
  path.join(buildDir, "chesstrix_wasm.js"),
  path.join(buildDir, "Release", "chesstrix_wasm.js")
];
const wasmCandidates = [
  path.join(buildDir, "chesstrix_wasm.wasm"),
  path.join(buildDir, "Release", "chesstrix_wasm.wasm")
];
const jsFile = jsCandidates.find(existsSync);
const wasmFile = wasmCandidates.find(existsSync);
if (!jsFile || !wasmFile) {
  console.error("WASM build completed, but chesstrix_wasm.js/wasm were not found in cpp/build-wasm.");
  process.exit(1);
}

copyFileSync(jsFile, path.join(outDir, "chesstrix_wasm.js"));
copyFileSync(wasmFile, path.join(outDir, "chesstrix_wasm.wasm"));
console.log(`WASM module copied to ${outDir}`);
