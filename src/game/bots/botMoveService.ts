import { Chess } from "chess.js";
import { isUciMove, parseUciMove } from "../engine/uciParser";
import { requestBestMove } from "../engine/stockfishClient";
import type { BotProfile } from "./botProfiles";

export async function getBotMove(chess: Chess, bot: BotProfile, chess960 = false) {
  const legalMoves = chess.moves({ verbose: true });
  if (!legalMoves.length) return null;

  if (bot.blunderChance > 0 && Math.random() < bot.blunderChance) {
    const humanMove = chooseHumanLikeMove(legalMoves);
    return { from: humanMove.from, to: humanMove.to, promotion: humanMove.promotion };
  }

  const response = await requestBestMove(
    { fen: chess.fen(), chess960 },
    { moveTimeMs: bot.moveTimeMs, chess960, elo: bot.elo, skillLevel: bot.skillLevel }
  ).catch(() => null);

  if (response?.available && response.bestMove && isUciMove(response.bestMove)) {
    const engineMove = parseUciMove(response.bestMove);
    const isLegal = legalMoves.some(
      (move) => move.from === engineMove.from && move.to === engineMove.to && (!engineMove.promotion || move.promotion === engineMove.promotion)
    );
    if (isLegal) return engineMove;
  }

  const fallback = chooseHumanLikeMove(legalMoves);
  return { from: fallback.from, to: fallback.to, promotion: fallback.promotion, missingEngine: true };
}

function chooseHumanLikeMove<T extends { from: string; to: string; san: string; captured?: string; piece: string; promotion?: string }>(moves: T[]) {
  const scored = moves.map((move) => {
    let score = 0;
    if (move.captured) score += 8;
    if (move.san.includes("+")) score += 5;
    if (["e4", "d4", "e5", "d5", "c4", "f4", "c5", "f5"].includes(move.to)) score += 4;
    if ((move.piece === "n" || move.piece === "b") && !["1", "8"].includes(move.to[1])) score += 3;
    if (move.promotion) score += 10;
    if (move.piece === "k" && !move.san.includes("O-O")) score -= 4;
    if (["a3", "h3", "a6", "h6"].includes(move.to)) score -= 2;
    return { move, score: score + Math.random() * 2 };
  });

  scored.sort((a, b) => b.score - a.score);
  const candidateCount = Math.max(1, Math.ceil(scored.length * 0.35));
  return scored[Math.floor(Math.random() * candidateCount)].move;
}
