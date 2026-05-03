import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type EngineScore = {
  type: "cp" | "mate";
  value: number;
  pov: "white";
  depth: number;
  raw: string;
  rawValue: number;
  rawPov: "sideToMove";
  fenSideToMove: "w" | "b";
  wdl?: { wins: number; draws: number; losses: number };
};

type EngineLine = {
  multipv: number;
  move?: string;
  evaluation: EngineScore;
  pv: string[];
  raw?: string;
};

type EnginePosition = {
  fen?: string;
  moves?: string[];
  chess960?: boolean;
};

type EngineOptions = {
  depth?: number;
  moveTimeMs?: number;
  elo?: number;
  skillLevel?: number;
  chess960?: boolean;
  multiPv?: number;
  threads?: number;
  hashMb?: number;
  showWdl?: boolean;
  searchMoves?: string[];
  requestId?: string;
  moveIndex?: number;
  timeoutMs?: number;
};

type PendingRequest = {
  lines: string[];
  resolve: (lines: string[]) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  until: (line: string) => boolean;
};

export class StockfishService {
  private process: ChildProcessWithoutNullStreams | null = null;
  private availablePath: string | null = null;
  private pending: PendingRequest | null = null;
  private initialized = false;
  private lastScore: EngineScore = { type: "cp", value: 0, pov: "white", depth: 0, raw: "", rawValue: 0, rawPov: "sideToMove", fenSideToMove: "w" };
  private analysisLines = new Map<number, EngineLine>();
  private queue: Promise<unknown> = Promise.resolve();
  private scorePerspective = 1;
  private rootFenSideToMove: "w" | "b" = "w";
  private optionValues = new Map<string, string>();

  async init() {
    if (this.initialized && this.process) {
      return { available: true, path: this.availablePath };
    }

    const enginePath = this.resolveEnginePath();
    if (!enginePath) {
      return {
        available: false,
        message: "Stockfish engine not found. Please install it or set STOCKFISH_PATH."
      };
    }

    this.availablePath = enginePath;
    this.process = spawn(enginePath, [], { windowsHide: true });
    this.process.stdout.setEncoding("utf8");
    this.process.stderr.setEncoding("utf8");
    this.process.stdout.on("data", (chunk: string) => this.handleOutput(chunk));
    this.process.on("exit", () => {
      this.process = null;
      this.initialized = false;
      this.optionValues.clear();
    });

    await this.command("uci", (line) => line === "uciok");
    await this.command("isready", (line) => line === "readyok");
    this.initialized = true;

    return { available: true, path: enginePath };
  }

  isAvailable() {
    return {
      available: Boolean(this.resolveEnginePath()),
      path: this.resolveEnginePath(),
      message: this.resolveEnginePath()
        ? "Stockfish engine found."
        : "Stockfish engine not found. Please install it or set STOCKFISH_PATH."
    };
  }

  async setDifficulty(profile: EngineOptions) {
    return this.enqueue(() => this.setDifficultyNow(profile));
  }

  async getBestMove(position: EnginePosition, options: EngineOptions = {}) {
    return this.enqueue(async () => {
      const init = await this.init();
      if (!init.available) return init;

      if (typeof options.elo === "number" || typeof options.skillLevel === "number") {
        await this.setDifficultyNow(options);
      }

      await this.writeOption("MultiPV", "1");
      await this.preparePosition(position, options);
      const go = options.moveTimeMs ? `go movetime ${options.moveTimeMs}` : `go depth ${options.depth ?? 12}`;
      const lines = await this.command(go, (line) => line.startsWith("bestmove"), 30000);
      const bestLine = lines.find((line) => line.startsWith("bestmove")) ?? "";
      const bestMove = bestLine.split(/\s+/)[1] ?? null;
      return { available: true, bestMove, evaluation: this.lastScore, raw: bestLine };
    });
  }

  async getEvaluation(position: EnginePosition, options: EngineOptions = {}) {
    return this.enqueue(async () => {
      const init = await this.init();
      if (!init.available) return init;

      await this.configureEvaluationOptions();
      await this.preparePosition(position, options);
      const go = options.moveTimeMs ? `go movetime ${options.moveTimeMs}` : `go depth ${options.depth ?? 12}`;
      const lines = await this.command(go, (line) => line.startsWith("bestmove"), 30000);
      return { available: true, evaluation: this.lastScore, raw: lines.join("\n") };
    });
  }

  async getAnalysis(position: EnginePosition, options: EngineOptions = {}) {
    return this.enqueue(async () => {
      const init = await this.init();
      if (!init.available) return init;

      await this.configureAnalysisOptions(options);
      await this.preparePosition(position, options);
      const searchMoves = options.searchMoves?.length ? `searchmoves ${options.searchMoves.join(" ")} ` : "";
      const go = options.moveTimeMs ? `go ${searchMoves}movetime ${options.moveTimeMs}` : `go ${searchMoves}depth ${options.depth ?? 14}`;
      const lines = await this.command(go, (line) => line.startsWith("bestmove"), options.timeoutMs ?? 60000);
      const bestLine = lines.find((line) => line.startsWith("bestmove")) ?? "";
      const bestMove = bestLine.split(/\s+/)[1] ?? undefined;
      const pvLines = [...this.analysisLines.values()].sort((a, b) => a.multipv - b.multipv);
      return {
        available: true,
        bestMove,
        evaluation: pvLines[0]?.evaluation ?? this.lastScore,
        lines: pvLines,
        depth: Math.max(...pvLines.map((line) => line.evaluation.depth), this.lastScore.depth, 0),
        raw: lines.join("\n"),
        requestId: options.requestId,
        moveIndex: options.moveIndex,
        fen: position.fen,
        multiPv: options.multiPv,
        requestedMove: options.searchMoves?.[0]
      };
    });
  }

  private async setDifficultyNow(profile: EngineOptions) {
    const init = await this.init();
    if (!init.available) return init;

    const limitStrength = typeof profile.elo === "number";
    const options: Array<[string, string]> = [["UCI_LimitStrength", limitStrength ? "true" : "false"]];
    if (limitStrength) {
      options.push(["UCI_Elo", String(profile.elo)]);
    }
    if (typeof profile.skillLevel === "number") {
      options.push(["Skill Level", String(profile.skillLevel)]);
    }
    await this.writeOptions(options);

    return { available: true };
  }

  private async configureEvaluationOptions() {
    await this.writeOptions([
      ["UCI_LimitStrength", "false"],
      ["Skill Level", "20"],
      ["MultiPV", "1"]
    ]);
  }

  private async configureAnalysisOptions(options: EngineOptions) {
    const nextOptions: Array<[string, string]> = [
      ["UCI_LimitStrength", "false"],
      ["Skill Level", "20"],
      ["MultiPV", String(Math.max(1, Math.min(5, Math.round(options.multiPv ?? 3))))]
    ];
    if (typeof options.threads === "number") nextOptions.push(["Threads", String(Math.max(1, Math.min(8, Math.round(options.threads))))]);
    if (typeof options.hashMb === "number") nextOptions.push(["Hash", String(Math.max(16, Math.min(1024, Math.round(options.hashMb))))]);
    if (options.showWdl ?? true) nextOptions.push(["UCI_ShowWDL", "true"]);
    await this.writeOptions(nextOptions);
  }

  async stop() {
    if (this.process) {
      this.process.stdin.write("stop\n");
    }
    return { ok: true };
  }

  quit() {
    if (this.process) {
      this.process.stdin.write("quit\n");
      this.process.kill();
      this.process = null;
      this.optionValues.clear();
    }
    return { ok: true };
  }

  private resolveEnginePath() {
    const candidates = [
      process.env.STOCKFISH_PATH,
      path.join(appRoot(), "engines", "stockfish", "stockfish.exe"),
      path.join(appRoot(), "engines", "stockfish", "stockfish")
    ].filter(Boolean) as string[];

    return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
  }

  private enqueue<T>(task: () => Promise<T>) {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async preparePosition(position: EnginePosition, options: EngineOptions) {
    await this.writeOption("UCI_Chess960", position.chess960 || options.chess960 ? "true" : "false");
    const moves = position.moves?.length ? ` moves ${position.moves.join(" ")}` : "";
    const command = position.fen ? `position fen ${position.fen}${moves}` : `position startpos${moves}`;
    this.scorePerspective = this.getWhitePerspectiveMultiplier(position);
    this.rootFenSideToMove = this.getRootSideToMove(position);
    this.lastScore = { type: "cp", value: 0, pov: "white", depth: 0, raw: "", rawValue: 0, rawPov: "sideToMove", fenSideToMove: this.rootFenSideToMove };
    this.analysisLines.clear();
    this.write(command);
  }

  private async writeOption(name: string, value: string) {
    await this.writeOptions([[name, value]]);
  }

  private async writeOptions(options: Array<[string, string]>) {
    const changed = options.filter(([name, value]) => this.optionValues.get(name) !== value);
    if (!changed.length) return;
    changed.forEach(([name, value]) => {
      this.write(`setoption name ${name} value ${value}`);
      this.optionValues.set(name, value);
    });
    await this.command("isready", (line) => line === "readyok");
  }

  private command(command: string, until: (line: string) => boolean, timeoutMs = 10000) {
    return new Promise<string[]>((resolve, reject) => {
      if (!this.process) {
        reject(new Error("Stockfish is not running."));
        return;
      }
      if (this.pending) {
        reject(new Error("Stockfish is busy."));
        return;
      }

      const pending: PendingRequest = {
        lines: [],
        resolve,
        reject,
        until,
        timeout: setTimeout(() => {
          this.pending = null;
          reject(new Error(`Stockfish timed out after command: ${command}`));
        }, timeoutMs)
      };
      this.pending = pending;
      this.write(command);
    });
  }

  private write(command: string) {
    this.process?.stdin.write(`${command}\n`);
  }

  private handleOutput(chunk: string) {
    const lines = chunk
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      this.captureScore(line);
      if (this.pending) {
        this.pending.lines.push(line);
        if (this.pending.until(line)) {
          clearTimeout(this.pending.timeout);
          const done = this.pending;
          this.pending = null;
          done.resolve(done.lines);
        }
      }
    }
  }

  private captureScore(line: string) {
    if (!line.startsWith("info ") || !line.includes(" score ")) return;

    const depthMatch = line.match(/\bdepth\s+(\d+)/);
    const multiPvMatch = line.match(/\bmultipv\s+(\d+)/);
    const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
    const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
    const wdlMatch = line.match(/\bwdl\s+(\d+)\s+(\d+)\s+(\d+)/);
    const pvMatch = line.match(/\bpv\s+(.+)$/);
    const depth = depthMatch ? Number(depthMatch[1]) : this.lastScore.depth;
    const wdl = wdlMatch
      ? {
          wins: Number(wdlMatch[1]) * (this.scorePerspective === 1 ? 1 : 0) + Number(wdlMatch[3]) * (this.scorePerspective === -1 ? 1 : 0),
          draws: Number(wdlMatch[2]),
          losses: Number(wdlMatch[3]) * (this.scorePerspective === 1 ? 1 : 0) + Number(wdlMatch[1]) * (this.scorePerspective === -1 ? 1 : 0)
        }
      : undefined;

    let score: EngineScore | null = null;
    if (cpMatch) {
      const rawValue = Number(cpMatch[1]);
      score = { type: "cp", value: rawValue * this.scorePerspective, pov: "white", depth, raw: line, rawValue, rawPov: "sideToMove", fenSideToMove: this.rootFenSideToMove, wdl };
    } else if (mateMatch) {
      const rawValue = Number(mateMatch[1]);
      score = { type: "mate", value: rawValue * this.scorePerspective, pov: "white", depth, raw: line, rawValue, rawPov: "sideToMove", fenSideToMove: this.rootFenSideToMove, wdl };
    }

    if (!score) return;
    const multipv = multiPvMatch ? Number(multiPvMatch[1]) : 1;
    const pv = pvMatch ? pvMatch[1].split(/\s+/).filter(Boolean) : [];
    const engineLine = { multipv, move: pv[0], evaluation: score, pv, raw: line };
    this.analysisLines.set(multipv, engineLine);
    if (multipv === 1) {
      this.lastScore = score;
    }
  }

  private getWhitePerspectiveMultiplier(position: EnginePosition) {
    const movesPlayed = position.moves?.length ?? 0;
    const fenTurn = position.fen?.split(/\s+/)[1] ?? "w";
    const startsWithWhiteToMove = fenTurn !== "b";
    const whiteToMove = movesPlayed % 2 === 0 ? startsWithWhiteToMove : !startsWithWhiteToMove;
    return whiteToMove ? 1 : -1;
  }

  private getRootSideToMove(position: EnginePosition): "w" | "b" {
    const movesPlayed = position.moves?.length ?? 0;
    const fenTurn = position.fen?.split(/\s+/)[1] === "b" ? "b" : "w";
    if (movesPlayed % 2 === 0) return fenTurn;
    return fenTurn === "w" ? "b" : "w";
  }
}

function appRoot() {
  return path.resolve(__dirname, "..");
}
