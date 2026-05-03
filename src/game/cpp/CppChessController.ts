import { Chess, type Move, type Square } from "chess.js";
import { moveToUci } from "../normal/moveUtils";

type WasmApi = {
  createGame: (variant: string) => string;
  loadFen: (fen: string) => string;
  reset: () => string;
  getFen: () => string;
  getBoardJson: () => string;
  getLegalMoves: (square: string) => string;
  makeMove: (from: string, to: string, promotion: string) => string;
  undo: () => string;
  getTurn: () => "w" | "b";
  getGameStatus: () => string;
  getMoveHistory: () => string;
  getCapturedPieces: () => string;
  getCastlingRights: () => string;
  analyzeMove: (evalBefore: number, evalAfter: number, sideToMove: "w" | "b") => string;
  classifyMove: (centipawnLoss: number) => string;
};

type CppResult = { ok: boolean; error?: string };
type CppMove = Partial<Move> & { uci?: string };
type BoardPiece = { square: string; type: string; color: "w" | "b" } | null;
type CapturedPieces = { white: string[]; black: string[] };
type AnalysisResult = { centipawnLoss: number; accuracy: number; classification: string };

declare global {
  interface Window {
    chesstrixCppWasm?: WasmApi;
  }
}

function readWasm() {
  return typeof window !== "undefined" ? window.chesstrixCppWasm : undefined;
}

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class CppChessController {
  private fallback: Chess;
  private wasm?: WasmApi;
  private uciMoves: string[] = [];

  constructor(private readonly variant: "standard" | "chess960" = "standard", fen?: string) {
    this.fallback = new Chess(fen);
    this.backend()?.createGame(variant);
    if (fen) this.load(fen);
  }

  private backend() {
    const next = readWasm();
    if (next && next !== this.wasm) {
      this.wasm = next;
      this.wasm.createGame(this.variant);
      this.wasm.loadFen(this.fallback.fen());
    }
    return this.wasm;
  }

  load(fen: string): void {
    this.fallback = new Chess(fen);
    this.uciMoves = [];
    this.backend()?.loadFen(fen);
  }

  fen(): string {
    return this.backend()?.getFen() ?? this.fallback.fen();
  }

  turn(): "w" | "b" {
    return this.backend()?.getTurn() ?? this.fallback.turn();
  }

  moves(options?: { square?: string; verbose?: boolean } | string): Move[] {
    const square = typeof options === "string" ? options : options?.square;
    const backend = this.backend();
    if (backend) {
      const moves = safeJson<CppMove[]>(backend.getLegalMoves(square ?? ""), []);
      return moves.map((move) => ({
        color: this.turn(),
        from: move.from,
        to: move.to,
        piece: move.piece,
        captured: move.captured,
        promotion: move.promotion,
        flags: move.flags ?? "n",
        san: move.san ?? move.uci ?? `${move.from}${move.to}`,
        lan: move.uci ?? `${move.from}${move.to}`,
        before: this.fen(),
        after: this.fen()
      })) as Move[];
    }
    return square ? this.fallback.moves({ square: square as Square, verbose: true }) : this.fallback.moves({ verbose: true });
  }

  move(from: string, to: string, promotion?: string): Move | null {
    const backend = this.backend();
    if (backend) {
      const before = this.fen();
      const response = safeJson<CppResult>(backend.makeMove(from, to, promotion ?? ""), { ok: false });
      if (!response.ok) return null;
      const after = this.fen();
      const history = this.history();
      const latest = history[history.length - 1];
      this.uciMoves.push(latest ? moveToUci(latest) : `${from}${to}${promotion ?? ""}`);
      this.fallback.load(after, { skipValidation: this.variant === "chess960" });
      return latest ?? ({
        color: before.includes(" w ") ? "w" : "b",
        from,
        to,
        piece: "p",
        captured: undefined,
        promotion,
        flags: "n",
        san: `${from}${to}`,
        lan: `${from}${to}${promotion ?? ""}`,
        before,
        after
      } as Move);
    }

    const move = this.fallback.move({ from, to, promotion }) as Move | null;
    if (move) this.uciMoves.push(moveToUci(move));
    return move;
  }

  undo(): Move | null {
    const backend = this.backend();
    if (backend) {
      const history = this.history();
      const latest = history[history.length - 1] ?? null;
      const response = safeJson<CppResult>(backend.undo(), { ok: false });
      if (!response.ok) return null;
      this.uciMoves.pop();
      this.fallback.load(this.fen(), { skipValidation: this.variant === "chess960" });
      return latest;
    }
    const move = this.fallback.undo() as Move | null;
    if (move) this.uciMoves.pop();
    return move;
  }

  reset(): void {
    this.backend()?.reset();
    this.fallback.reset();
    this.uciMoves = [];
  }

  history(): Move[] {
    const backend = this.backend();
    if (backend) return safeJson<Move[]>(backend.getMoveHistory(), []);
    return this.fallback.history({ verbose: true }) as Move[];
  }

  board(): BoardPiece[][] {
    const backend = this.backend();
    if (backend) return safeJson<BoardPiece[][]>(backend.getBoardJson(), []);
    return this.fallback.board().map((row) => row.map((piece) => piece ? { square: piece.square, type: piece.type, color: piece.color } : null));
  }

  game() {
    return this.fallback;
  }

  pgn() {
    return this.fallback.pgn();
  }

  getUciMoves() {
    return [...this.uciMoves];
  }

  getGameStatus() {
    return this.backend()?.getGameStatus() ?? undefined;
  }

  getCapturedPieces(): CapturedPieces | undefined {
    const backend = this.backend();
    return backend ? safeJson<CapturedPieces>(backend.getCapturedPieces(), { white: [], black: [] }) : undefined;
  }

  getCastlingRights() {
    return this.backend()?.getCastlingRights() ?? this.fallback.fen().split(/\s+/)[2];
  }

  analyzeMove(evalBefore: number, evalAfter: number, sideToMove: "w" | "b"): AnalysisResult {
    const backend = this.backend();
    if (backend) return safeJson<AnalysisResult>(backend.analyzeMove(evalBefore, evalAfter, sideToMove), fallbackAnalyzeMove(evalBefore, evalAfter, sideToMove));
    return fallbackAnalyzeMove(evalBefore, evalAfter, sideToMove);
  }

  classifyMove(centipawnLoss: number) {
    const backend = this.backend();
    if (backend) return backend.classifyMove(centipawnLoss);
    return fallbackClassifyMove(centipawnLoss);
  }
}

export function createGame(variant: "standard" | "chess960" = "standard") {
  return new CppChessController(variant);
}

function fallbackAnalyzeMove(evalBefore: number, evalAfter: number, sideToMove: "w" | "b"): AnalysisResult {
  const multiplier = sideToMove === "b" ? -1 : 1;
  const centipawnLoss = Math.max(0, (evalBefore - evalAfter) * multiplier);
  const accuracy = Math.max(0, Math.min(100, 100 * Math.exp(-centipawnLoss / 180)));
  return { centipawnLoss, accuracy, classification: fallbackClassifyMove(centipawnLoss) };
}

function fallbackClassifyMove(centipawnLoss: number) {
  if (centipawnLoss <= 10) return "Best";
  if (centipawnLoss <= 25) return "Excellent";
  if (centipawnLoss <= 50) return "Good";
  if (centipawnLoss <= 100) return "Inaccuracy";
  if (centipawnLoss <= 250) return "Mistake";
  return "Blunder";
}
