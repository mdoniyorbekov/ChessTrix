import { Chess } from "chess.js";
import puzzles from "../../data/puzzles.json";

export type Puzzle = {
  id: number;
  sourceId?: string;
  fen: string;
  solution: string[];
  rating: number;
  ratingRange?: string;
  popularity?: number;
  plays?: number;
  theme: string;
  themes?: string;
  title: string;
};

const solvedKey = "chesstrix.puzzles.solved";

export function getPuzzles() {
  return puzzles as Puzzle[];
}

export function getPuzzle(id: number) {
  return getPuzzles().find((puzzle) => puzzle.id === id) ?? getPuzzles()[0];
}

export function getNextPuzzleId(id: number) {
  const puzzles = getPuzzles();
  const currentIndex = puzzles.findIndex((puzzle) => puzzle.id === id);
  const next = puzzles[currentIndex + 1] ?? puzzles[0];
  return next.id;
}

export function getPuzzleRatingRanges() {
  return Array.from(new Set(getPuzzles().map((puzzle) => puzzle.ratingRange ?? ratingRangeFor(puzzle.rating))));
}

export function getPuzzlesByRatingRange() {
  return getPuzzleRatingRanges().map((range) => ({
    range,
    puzzles: getPuzzles().filter((puzzle) => (puzzle.ratingRange ?? ratingRangeFor(puzzle.rating)) === range)
  }));
}

export function getSolvedPuzzleIds() {
  const saved = localStorage.getItem(solvedKey);
  return new Set<number>(saved ? JSON.parse(saved) : []);
}

export function markPuzzleSolved(id: number) {
  const solved = getSolvedPuzzleIds();
  solved.add(id);
  localStorage.setItem(solvedKey, JSON.stringify([...solved]));
}

export function isLegalPuzzleMove(fen: string, move: string) {
  const chess = new Chess(fen);
  const result = chess.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] });
  return Boolean(result);
}

function ratingRangeFor(rating: number) {
  const lower = Math.floor(rating / 100) * 100;
  return `${lower}-${lower + 100}`;
}
