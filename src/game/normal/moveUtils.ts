import type { Move } from "chess.js";

export function moveToUci(move: Pick<Move, "from" | "to" | "promotion">) {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

export function capturedPieces(history: Move[]) {
  return history.reduce(
    (acc, move) => {
      if (move.captured) {
        const side = move.color === "w" ? "white" : "black";
        acc[side].push(move.captured);
      }
      return acc;
    },
    { white: [] as string[], black: [] as string[] }
  );
}

export function gameStatus(chess: { isCheckmate: () => boolean; isStalemate: () => boolean; isDraw: () => boolean; isCheck: () => boolean; turn: () => "w" | "b" }) {
  if (chess.isCheckmate()) return `Checkmate. ${chess.turn() === "w" ? "Black" : "White"} wins`;
  if (chess.isStalemate()) return "Stalemate";
  if (chess.isDraw()) return "Draw";
  if (chess.isCheck()) return `${chess.turn() === "w" ? "White" : "Black"} is in check`;
  return `${chess.turn() === "w" ? "White" : "Black"} to move`;
}
