import { Chess } from "chess.js";

export type Pocket = Record<"p" | "n" | "b" | "r" | "q", number>;
export type CrazyhouseState = {
  chess: Chess;
  pockets: { w: Pocket; b: Pocket };
};

export function createCrazyhouseState(): CrazyhouseState {
  return {
    chess: new Chess(),
    pockets: { w: emptyPocket(), b: emptyPocket() }
  };
}

export function emptyPocket(): Pocket {
  return { p: 0, n: 0, b: 0, r: 0, q: 0 };
}

export function crazyhouseMove(state: CrazyhouseState, from: string, to: string, promotion?: string) {
  const move = state.chess.move({ from, to, promotion });
  if (move?.captured && move.captured !== "k") {
    state.pockets[move.color][move.captured as keyof Pocket] += 1;
  }
  return move;
}

export function canDrop(state: CrazyhouseState, color: "w" | "b", piece: keyof Pocket, square: string) {
  if (state.pockets[color][piece] <= 0) return false;
  if (state.chess.get(square as never)) return false;
  if (piece === "p" && (square[1] === "1" || square[1] === "8")) return false;
  return state.chess.turn() === color;
}

export function dropPiece(state: CrazyhouseState, color: "w" | "b", piece: keyof Pocket, square: string) {
  if (!canDrop(state, color, piece, square)) return false;
  // chess.js does not model Crazyhouse drops, so this keeps pocket/UI behavior separate.
  state.pockets[color][piece] -= 1;
  state.chess.put({ type: piece, color }, square as never);
  switchTurn(state.chess);
  return true;
}

function switchTurn(chess: Chess) {
  const fen = chess.fen().split(" ");
  fen[1] = fen[1] === "w" ? "b" : "w";
  chess.load(fen.join(" "));
}
