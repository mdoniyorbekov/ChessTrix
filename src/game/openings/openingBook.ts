import { Chess } from "chess.js";
import openingsData from "../../data/openings.json";

export type OpeningEntry = {
  fen: string;
  key: string;
  eco: string;
  name: string;
  moves: string;
  source: string;
};

const openings = openingsData as OpeningEntry[];
const byPosition = new Map(openings.map((opening) => [opening.key, opening]));

export function findOpeningForFen(fen: string) {
  return byPosition.get(positionKey(fen));
}

export function findOpeningAfterMove(beforeFen: string, move: { from: string; to: string; promotion?: string }) {
  const chess = new Chess(beforeFen);
  const result = chess.move(move);
  if (!result) return undefined;
  return findOpeningForFen(chess.fen());
}

export function getOpeningContinuations(fen: string) {
  const chess = new Chess(fen);
  return chess.moves({ verbose: true }).flatMap((move) => {
    const next = new Chess(fen);
    const result = next.move({ from: move.from, to: move.to, promotion: move.promotion });
    if (!result) return [];
    const opening = findOpeningForFen(next.fen());
    return opening ? [{ san: result.san, uci: `${result.from}${result.to}${result.promotion ?? ""}`, opening }] : [];
  });
}

export function openingDisplay(opening?: OpeningEntry) {
  return opening ? `${opening.eco} ${opening.name}` : "Opening not found";
}

function positionKey(fen: string) {
  return fen.split(/\s+/).slice(0, 4).join(" ");
}
