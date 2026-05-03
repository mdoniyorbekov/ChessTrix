import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const exe = path.join("cpp", "build", process.platform === "win32" ? "chesstrix_cpp_tests.exe" : "chesstrix_cpp_tests");

if (!existsSync(exe)) {
  const build = spawnSync("node", ["scripts/build-cpp.mjs"], { stdio: "inherit", shell: process.platform === "win32" });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const test = spawnSync(exe, [], { stdio: "inherit", shell: process.platform === "win32" });
process.exit(test.status ?? 1);
