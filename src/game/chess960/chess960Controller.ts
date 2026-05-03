import { Chess } from "chess.js";
import { generateChess960Position } from "./chess960Generator";

export function createChess960Game() {
  const position = generateChess960Position();
  const chess = new Chess(position.fen);
  return { position, chess };
}

export const chess960Limitations =
  "Chess960 starts and castling are handled by Chesstrix rules, including unusual king and rook starting squares.";
