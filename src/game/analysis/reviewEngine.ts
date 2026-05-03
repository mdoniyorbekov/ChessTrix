import { Chess, type Move } from "chess.js";
import { findOpeningAfterMove, findOpeningForFen, getOpeningContinuations, openingDisplay, type OpeningEntry } from "../openings/openingBook";
import { formatEvaluation, type EngineAnalysis, type EngineEvaluation, type EngineLine, type ScorePov } from "../engine/evaluation";
import { requestAnalysis } from "../engine/stockfishClient";
import { executeChess960Castling, isChess960CastlingMove, sanitizeChess960FenAfterMove } from "../chess960/chess960Castling";
import { moveToUci } from "../normal/moveUtils";

export type ReviewClassification =
  | "Book"
  | "Forced"
  | "Checkmate"
  | "Brilliant"
  | "Great"
  | "Best"
  | "Excellent"
  | "Good"
  | "Inaccuracy"
  | "Mistake"
  | "Miss"
  | "Blunder";

export type NormalizedScore = {
  cpWhite: number;
  cpMover: number;
  mateWhite?: number;
  mateMover?: number;
};

export type ReviewLine = {
  multipv: number;
  move?: string;
  san?: string;
  evaluation: EngineEvaluation;
  normalized: NormalizedScore;
  pv: string[];
  pvSan: string[];
};

export type ReviewMoveDebug = {
  requestIdBest: string;
  requestIdActual: string;
  fenSideToMove: "w" | "b";
  rawBestScore?: number;
  rawActualScore?: number;
  bestScorePov: ScorePov;
  actualScorePov: ScorePov;
  normalizedBestWhite: number;
  normalizedActualWhite: number;
  normalizedBestMover: number;
  normalizedActualMover: number;
  bestWinPercent: number;
  actualWinPercent: number;
  legalMoveCount: number;
  materialBefore: number;
  materialAfter: number;
  materialAfterOpponentBestReply?: number;
  sacrificeCandidate: boolean;
  materialDelta: number;
  materialSacrificed: number;
  simpleRecapture: boolean;
  topMoveRank?: number;
  secondBestGapCp?: number;
  secondBestGapWinPercent?: number;
  bestExpected: number;
  playedExpected: number;
  expectedLoss: number;
  secondBestExpected?: number;
  greatReason?: string;
  brilliantReason?: string;
  missReason?: string;
  specialRejected: string[];
  multiPv: ReviewLine[];
};

export type ReviewMove = {
  index: number;
  moveIndex: number;
  moveNumber: number;
  side: "w" | "b";
  moverColor: "w" | "b";
  san: string;
  actualMoveSan: string;
  uci: string;
  actualMoveUci: string;
  played: { from: string; to: string; promotion?: string };
  beforeFen: string;
  afterFen: string;
  fenBefore: string;
  fenAfter: string;
  classification: ReviewClassification;
  label: ReviewClassification;
  bestMove?: string;
  bestMoveUci?: string;
  bestMoveSan?: string;
  topLines: ReviewLine[];
  evaluationBefore: EngineEvaluation;
  evaluationAfter: EngineEvaluation;
  bestScoreWhite: number;
  actualScoreWhite: number;
  bestScoreMover: number;
  actualScoreMover: number;
  expectedBefore: number;
  expectedAfter: number;
  expectedLoss: number;
  bestWinPercent: number;
  actualWinPercent: number;
  winPercentLoss: number;
  centipawnLoss: number;
  accuracy?: number;
  excludeFromAccuracyAverage?: boolean;
  opening?: OpeningEntry;
  explanation: string;
  reasons: string[];
  captured?: string;
  debug: ReviewMoveDebug;
};

export type PlayerReviewStats = {
  player: "White" | "Black";
  accuracy: number | null;
  analyzedMoves: number;
  counts: Record<ReviewClassification, number>;
};

export type ReviewResult = {
  cacheKey: string;
  engine: string;
  engineVersion: string;
  depth: number;
  multiPv: number;
  createdAt: string;
  initialFen?: string;
  moves: string[];
  result: {
    winner: "White" | "Black" | "Draw" | "Unknown";
    reason: string;
    totalMoves: number;
  };
  openingName: string;
  opening?: OpeningEntry;
  moveReviews: ReviewMove[];
  players: PlayerReviewStats[];
  gameAccuracy: number | null;
  evaluations: EngineEvaluation[];
  pgn: string;
};

export type ReviewOptions = {
  depth: number;
  multiPv: number;
  threads: number;
  hashMb: number;
};

export type ReviewProgress = {
  done: number;
  total: number;
  message: string;
  gameAccuracy?: number | null;
  players?: Array<{ player: "White" | "Black"; accuracy: number | null; analyzedMoves: number }>;
};

export const reviewClassifications: ReviewClassification[] = [
  "Book",
  "Forced",
  "Checkmate",
  "Brilliant",
  "Great",
  "Best",
  "Excellent",
  "Good",
  "Inaccuracy",
  "Mistake",
  "Miss",
  "Blunder"
];

const defaultCounts = () => Object.fromEntries(reviewClassifications.map((item) => [item, 0])) as Record<ReviewClassification, number>;
const reviewCacheVersion = 8;
const analysisDebug = typeof localStorage !== "undefined" && localStorage.getItem("chesstrix.review.debug") === "true";
const materialValues: Record<string, number> = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0 };

export async function analyzeGameReview(
  moves: string[],
  initialFen: string | undefined,
  options: ReviewOptions,
  onProgress: (progress: ReviewProgress) => void,
  isCancelled: () => boolean
): Promise<ReviewResult> {
  const cached = loadReviewFromCache(moves, initialFen, options);
  if (cached) return cached;

  const chess = new Chess(initialFen);
  const reviewIsChess960 = Boolean(initialFen && isChess960Fen(initialFen));
  const moveReviews: ReviewMove[] = [];
  const evaluations: EngineEvaluation[] = [];
  let deepestOpening: OpeningEntry | undefined = findOpeningForFen(chess.fen());
  let previousMove: Move | null = null;
  let positionRequestId = `review-pos-0-${Date.now()}-${hashString(chess.fen()).slice(0, 6)}`;

  onProgress({ done: 0, total: moves.length, message: "Analyzing starting position..." });
  let positionAnalysis = await analyzePosition(chess.fen(), options, reviewIsChess960, positionRequestId, 0);

  for (let index = 0; index < moves.length; index += 1) {
    if (isCancelled()) throw new Error("Analysis canceled.");

    const beforeFen = chess.fen();
    const moverColor = chess.turn();
    const fenSideToMove = fenTurn(beforeFen);
    const legalMoves = chess.moves({ verbose: true }) as Move[];
    const legalMoveCount = legalMoves.length;
    const played = parseUciMove(moves[index]);

    onProgress({ ...reviewProgressFromMoves(moveReviews, moves.length, `Analyzing move ${index + 1} / ${moves.length}...`), done: index });

    const move = applyReviewMove(chess, initialFen, played);
    if (!move) continue;

    const actualMoveUci = moveToUci(move);
    const afterFen = chess.fen();
    const opening = findOpeningAfterMove(beforeFen, played);
    if (opening) deepestOpening = opening;

    const bestRequestId = positionRequestId;
    const bestAnalysis = positionAnalysis;
    const actualRequestId = `review-pos-${index + 1}-${Date.now()}-${hashString(afterFen).slice(0, 6)}`;
    const actualAnalysis = await analyzePosition(afterFen, index === moves.length - 1 ? { ...options, multiPv: 1 } : options, reviewIsChess960, actualRequestId, index + 1);
    positionRequestId = actualRequestId;
    positionAnalysis = actualAnalysis;
    verifyAnalysis(bestAnalysis, bestRequestId, index, beforeFen);
    verifyAnalysis(actualAnalysis, actualRequestId, index + 1, afterFen);

    const bestMove = bestAnalysis.bestMove ?? bestAnalysis.lines[0]?.move;
    const normalizedBest = normalizeScoreToWhitePov(bestAnalysis.evaluation, fenSideToMove, moverColor);
    const normalizedActual = normalizeScoreToWhitePov(actualAnalysis.evaluation, fenSideToMove, moverColor);
    const bestEvaluation = compactEvaluation(bestAnalysis.evaluation);
    const actualEvaluation = compactEvaluation(actualAnalysis.evaluation);
    let centipawnLoss = Math.max(0, normalizedBest.cpMover - normalizedActual.cpMover);
    if (centipawnLoss <= 5) centipawnLoss = 0;

    const bestWinPercent = cpToWinPercent(normalizedBest.cpMover);
    const actualWinPercent = cpToWinPercent(normalizedActual.cpMover);
    const bestExpected = bestWinPercent / 100;
    const playedExpected = actualWinPercent / 100;
    const expectedLoss = Math.max(0, bestExpected - playedExpected);
    let winPercentLoss = Math.max(0, bestWinPercent - actualWinPercent);
    if (centipawnLoss === 0) winPercentLoss = 0;
    winPercentLoss = dampenDecidedPositionLoss(normalizedBest.cpMover, normalizedActual.cpMover, winPercentLoss);
    const accuracy = winLossToAccuracy(winPercentLoss);

    const topLines = bestAnalysis.lines.map((line) => engineLineToReviewLine(beforeFen, line, moverColor));
    const materialBefore = calculateMaterialBalance(beforeFen, moverColor);
    const materialAfter = calculateMaterialBalance(afterFen, moverColor);
    const materialDelta = (materialAfter - materialBefore) / 100;
    const materialAfterOpponentBestReply =
      materialAfterBestReply(afterFen, moverColor, actualAnalysis.bestMove ?? actualAnalysis.lines[0]?.move) ??
      materialAfterPvReply(beforeFen, moverColor, topLines, actualMoveUci);
    const sacrifice = analyzeSacrifice({
      beforeFen,
      afterFen,
      moverColor,
      movedTo: move.to,
      actualMoveUci,
      expectedLoss,
      bestExpected,
      playedExpected,
      materialBefore,
      materialAfter,
      materialAfterOpponentBestReply,
      move
    });
    const sacrificeCandidate = sacrifice.isSacrifice;
    const topMoveRank = rankInMultiPv(actualMoveUci, topLines);
    const secondBest = topLines[1];
    const thirdBest = topLines[2];
    const secondBestExpected = secondBest ? cpToWinPercent(secondBest.normalized.cpMover) / 100 : undefined;
    const thirdBestExpected = thirdBest ? cpToWinPercent(thirdBest.normalized.cpMover) / 100 : undefined;
    const secondBestGapCp = secondBest ? Math.max(0, normalizedBest.cpMover - secondBest.normalized.cpMover) : undefined;
    const secondBestGapWinPercent = secondBest ? Math.max(0, bestWinPercent - cpToWinPercent(secondBest.normalized.cpMover)) : undefined;
    const simpleRecapture = isSimpleRecapture(previousMove, move);
    const isBook = Boolean(opening && getOpeningContinuations(beforeFen).some((entry) => entry.uci === actualMoveUci));
    const actualCheckmates = move.san.includes("#");
    const classificationDecision = classifyMove({
      isBook,
      isForced: legalMoveCount === 1,
      actualCheckmates,
      actualMoveUci,
      bestMove,
      beforeFen,
      afterFen,
      previousClassification: moveReviews[moveReviews.length - 1]?.classification,
      bestExpected,
      playedExpected,
      expectedLoss,
      secondBestExpected,
      thirdBestExpected,
      centipawnLoss,
      winPercentLoss,
      bestScoreMover: normalizedBest.cpMover,
      actualScoreMover: normalizedActual.cpMover,
      bestMateMover: normalizedBest.mateMover,
      actualMateMover: normalizedActual.mateMover,
      secondBestGapCp,
      secondBestGapWinPercent,
      legalMoveCount,
      isEndgame: isEndgame(beforeFen),
      sacrifice,
      simpleRecapture,
      topMoveRank,
      move,
      topLines
    });
    const classification = classificationDecision.classification;
    const excludeFromAccuracyAverage = classification === "Book" || classification === "Forced";
    const reasons = reasonsFor({
      classification,
      bestMove,
      actualMoveUci,
      centipawnLoss,
      expectedLoss,
      secondBestGapCp,
      secondBestGapWinPercent,
      sacrificeCandidate,
      simpleRecapture,
      bestMateMover: normalizedBest.mateMover,
      actualMateMover: normalizedActual.mateMover,
      actualCheckmates
    });

    const reviewLineMultiPv = topLines;
    const reviewMove: ReviewMove = {
      index,
      moveIndex: index,
      moveNumber: Math.floor(index / 2) + 1,
      side: moverColor,
      moverColor,
      san: move.san,
      actualMoveSan: move.san,
      uci: actualMoveUci,
      actualMoveUci,
      played: { from: move.from, to: move.to, promotion: move.promotion },
      beforeFen,
      afterFen,
      fenBefore: beforeFen,
      fenAfter: afterFen,
      classification,
      label: classification,
      bestMove,
      bestMoveUci: bestMove,
      bestMoveSan: bestMove ? uciToSan(beforeFen, bestMove) : undefined,
      topLines,
      evaluationBefore: bestEvaluation,
      evaluationAfter: actualEvaluation,
      bestScoreWhite: normalizedBest.cpWhite,
      actualScoreWhite: normalizedActual.cpWhite,
      bestScoreMover: normalizedBest.cpMover,
      actualScoreMover: normalizedActual.cpMover,
      expectedBefore: bestWinPercent / 100,
      expectedAfter: actualWinPercent / 100,
      expectedLoss,
      bestWinPercent,
      actualWinPercent,
      winPercentLoss,
      centipawnLoss,
      accuracy: excludeFromAccuracyAverage ? 100 : accuracy,
      excludeFromAccuracyAverage,
      opening,
      explanation: reasons[0],
      reasons,
      captured: move.captured,
      debug: {
        requestIdBest: bestRequestId,
        requestIdActual: actualRequestId,
        fenSideToMove,
        rawBestScore: bestAnalysis.evaluation.rawValue ?? bestAnalysis.evaluation.value,
        rawActualScore: actualAnalysis.evaluation.rawValue ?? actualAnalysis.evaluation.value,
        bestScorePov: bestAnalysis.evaluation.pov ?? "white",
        actualScorePov: actualAnalysis.evaluation.pov ?? "white",
        normalizedBestWhite: normalizedBest.cpWhite,
        normalizedActualWhite: normalizedActual.cpWhite,
        normalizedBestMover: normalizedBest.cpMover,
        normalizedActualMover: normalizedActual.cpMover,
        bestWinPercent,
        actualWinPercent,
        legalMoveCount,
        materialBefore,
        materialAfter,
        materialAfterOpponentBestReply,
        sacrificeCandidate,
        materialDelta,
        materialSacrificed: sacrifice.materialSacrificed,
        simpleRecapture,
        topMoveRank,
        secondBestGapCp,
        secondBestGapWinPercent,
        bestExpected,
        playedExpected,
        expectedLoss,
        secondBestExpected,
        greatReason: classificationDecision.greatReason,
        brilliantReason: classificationDecision.brilliantReason,
        missReason: classificationDecision.missReason,
        specialRejected: classificationDecision.specialRejected,
        multiPv: analysisDebug ? reviewLineMultiPv : []
      }
    };

    moveReviews.push(reviewMove);
    evaluations.push(actualEvaluation);
    previousMove = move;
    logAnalysisDebug(reviewMove);
    onProgress(reviewProgressFromMoves(moveReviews, moves.length, `Analyzed move ${index + 1} / ${moves.length}`));
  }

  const result = buildResult(new Chess(initialFen), moves);
  const review: ReviewResult = {
    cacheKey: reviewCacheKey(moves, initialFen, options),
    engine: "Stockfish",
    engineVersion: "Stockfish",
    depth: options.depth,
    multiPv: options.multiPv,
    createdAt: new Date().toISOString(),
    initialFen,
    moves,
    result,
    openingName: openingDisplay(deepestOpening),
    opening: deepestOpening,
    moveReviews,
    players: buildPlayerStats(moveReviews),
    gameAccuracy: averageAccuracy(moveReviews),
    evaluations,
    pgn: buildPgn(initialFen, moves)
  };
  saveReviewToCache(review);
  return review;
}

export async function analyzeRetryMove(beforeFen: string, move: { from: string; to: string; promotion?: string }, options: ReviewOptions) {
  const chess = new Chess(beforeFen);
  const moverColor = chess.turn();
  const result = chess.move(move) as Move | null;
  if (!result) return { ok: false, message: "That move is illegal in this position." };

  const actualMoveUci = moveToUci(result);
  const requestBase = `retry-${Date.now()}-${hashString(beforeFen).slice(0, 6)}`;
  const before = await analyzePosition(beforeFen, options, isChess960Fen(beforeFen), `${requestBase}-best`, 0);
  const actual = await analyzePosition(beforeFen, { ...options, multiPv: 1 }, isChess960Fen(beforeFen), `${requestBase}-actual`, 0, [actualMoveUci]);
  const best = normalizeScoreToWhitePov(before.evaluation, fenTurn(beforeFen), moverColor);
  const played = normalizeScoreToWhitePov(actual.evaluation, fenTurn(beforeFen), moverColor);
  const centipawnLoss = Math.max(0, best.cpMover - played.cpMover);
  const winPercentLoss = Math.max(0, cpToWinPercent(best.cpMover) - cpToWinPercent(played.cpMover));
  const topMoves = before.lines.map((line) => line.move).filter(Boolean);
  const good = winPercentLoss <= 3 || centipawnLoss <= 25 || topMoves.includes(actualMoveUci);
  return {
    ok: true,
    good,
    message: good ? "Good retry. That keeps the position healthy." : "Still not best. Try to preserve more of the engine's expected score.",
    bestMove: before.bestMove,
    bestMoveSan: before.bestMove ? uciToSan(beforeFen, before.bestMove) : undefined,
    expectedLoss: winPercentLoss / 100,
    centipawnLoss
  };
}

async function analyzePosition(fen: string, options: ReviewOptions, chess960: boolean, requestId: string, moveIndex: number, searchMoves?: string[]): Promise<EngineAnalysis> {
  const response = await requestAnalysis(
    { fen, chess960 },
    {
      depth: options.depth,
      multiPv: searchMoves?.length ? 1 : Math.max(1, Math.min(5, options.multiPv)),
      threads: options.threads,
      hashMb: options.hashMb,
      showWdl: true,
      chess960,
      searchMoves,
      requestId,
      moveIndex
    }
  );
  if (!response.available || !response.analysis) throw new Error(response.message ?? "Stockfish analysis was unavailable.");
  return response.analysis;
}

function verifyAnalysis(analysis: EngineAnalysis, requestId: string, moveIndex: number, fen: string, requestedMove?: string) {
  if (analysis.requestId && analysis.requestId !== requestId) throw new Error("Stale Stockfish analysis response ignored.");
  if (typeof analysis.moveIndex === "number" && analysis.moveIndex !== moveIndex) throw new Error("Mismatched Stockfish move analysis ignored.");
  if (analysis.fen && analysis.fen !== fen) throw new Error("Mismatched Stockfish FEN analysis ignored.");
  if (requestedMove && analysis.requestedMove && analysis.requestedMove !== requestedMove) throw new Error("Mismatched Stockfish search move analysis ignored.");
}

export function normalizeScoreToWhitePov(score: EngineEvaluation, fenSideToMove: "w" | "b", moverColor: "w" | "b"): NormalizedScore {
  const pov = score.pov ?? "white";
  const valueWhite = pov === "white" ? score.value : score.value * (fenSideToMove === "w" ? 1 : -1);
  const cpWhite = score.type === "mate" ? mateToCp(valueWhite) : safeCp(valueWhite);
  const cpMover = cpWhite * (moverColor === "w" ? 1 : -1);
  if (score.type === "mate") {
    const mateWhite = valueWhite;
    return { cpWhite, cpMover, mateWhite, mateMover: mateWhite * (moverColor === "w" ? 1 : -1) };
  }
  return { cpWhite, cpMover };
}

export function mateToCp(mateIn: number): number {
  if (!Number.isFinite(mateIn) || mateIn === 0) return 0;
  const sign = mateIn > 0 ? 1 : -1;
  return sign * (100000 - Math.min(999, Math.abs(mateIn)) * 100);
}

export function cpToWinPercent(cpMover: number): number {
  const capped = Math.max(-1000, Math.min(1000, safeCp(cpMover)));
  return 100 / (1 + Math.exp(-capped / 250));
}

export function winLossToAccuracy(winPercentLoss: number): number {
  const acc = 103.1668 * Math.exp(-0.04354 * Math.max(0, winPercentLoss)) - 3.1669;
  return clamp(acc, 0, 100);
}

type ClassificationDecision = {
  classification: ReviewClassification;
  greatReason?: string;
  brilliantReason?: string;
  missReason?: string;
  specialRejected: string[];
};

type SacrificeInfo = {
  isSacrifice: boolean;
  materialDelta: number;
  materialSacrificed: number;
  reason?: string;
  rejectedReason?: string;
};

function classifyMove(input: {
  isBook: boolean;
  isForced: boolean;
  actualCheckmates: boolean;
  actualMoveUci: string;
  bestMove?: string;
  beforeFen: string;
  afterFen: string;
  previousClassification?: ReviewClassification;
  bestExpected: number;
  playedExpected: number;
  expectedLoss: number;
  secondBestExpected?: number;
  thirdBestExpected?: number;
  centipawnLoss: number;
  winPercentLoss: number;
  bestScoreMover: number;
  actualScoreMover: number;
  bestMateMover?: number;
  actualMateMover?: number;
  secondBestGapCp?: number;
  secondBestGapWinPercent?: number;
  legalMoveCount: number;
  isEndgame: boolean;
  sacrifice: SacrificeInfo;
  simpleRecapture: boolean;
  topMoveRank?: number;
  move: Move;
  topLines: ReviewLine[];
}): ClassificationDecision {
  const specialRejected: string[] = [];
  if (input.isBook) return { classification: "Book", specialRejected };

  const missReason = missedOpportunityReason(input);
  if (missReason) return { classification: "Miss", missReason, specialRejected };
  specialRejected.push("Miss rejected: no large, clearly tactical missed chance.");

  const brilliantReason = brilliantMoveReason(input);
  if (brilliantReason) return { classification: "Brilliant", brilliantReason, specialRejected };
  specialRejected.push(`Brilliant rejected: ${input.sacrifice.rejectedReason ?? "not a strict engine-approved piece sacrifice."}`);

  const greatReason = greatMoveReason(input);
  if (greatReason) return { classification: "Great", greatReason, specialRejected };
  specialRejected.push("Great rejected: move was not critical enough or alternatives were not much worse.");

  return { classification: normalClassification(input.expectedLoss, input.actualMoveUci === input.bestMove), specialRejected };
}

function reasonsFor(input: {
  classification: ReviewClassification;
  bestMove?: string;
  actualMoveUci: string;
  centipawnLoss: number;
  expectedLoss: number;
  secondBestGapCp?: number;
  secondBestGapWinPercent?: number;
  sacrificeCandidate: boolean;
  simpleRecapture: boolean;
  bestMateMover?: number;
  actualMateMover?: number;
  actualCheckmates: boolean;
}) {
  const reasons: string[] = [];
  switch (input.classification) {
    case "Book":
      reasons.push("Book move. This follows known opening theory.");
      break;
    case "Forced":
      reasons.push("Only legal move.");
      break;
    case "Checkmate":
      reasons.push("Best move. You found checkmate.");
      break;
    case "Brilliant":
      reasons.push("Brilliant move. This was a strong sacrifice that the engine approves.");
      break;
    case "Great":
      reasons.push("Great move. This was a critical move: most alternatives were much worse.");
      break;
    case "Best":
      reasons.push("Best move. You matched the engine's top choice.");
      break;
    case "Excellent":
      reasons.push("Excellent move. This was almost as strong as the engine's best move.");
      break;
    case "Good":
      reasons.push("Good move. Solid, but there was a slightly better option.");
      break;
    case "Miss":
      reasons.push("Miss. You had a strong chance to punish your opponent but did not take it.");
      break;
    case "Mistake":
      reasons.push("Mistake. This noticeably worsened your position.");
      break;
    case "Blunder":
      reasons.push("Blunder. This gave the opponent a major advantage.");
      break;
    case "Inaccuracy":
      reasons.push("Inaccuracy. This gave up a small part of your advantage.");
      break;
  }
  if (input.classification === "Brilliant" && input.sacrificeCandidate) reasons.push("The material loss is real and Stockfish still keeps it near the top.");
  if (input.classification === "Great" && typeof input.secondBestGapWinPercent === "number") reasons.push(`The next engine choice loses about ${input.secondBestGapWinPercent.toFixed(1)} win percentage points.`);
  reasons.push(`Expected-points loss: ${input.expectedLoss.toFixed(3)}.`);
  return reasons;
}

function normalClassification(expectedLoss: number, isEngineTopMove: boolean): ReviewClassification {
  if (isEngineTopMove || expectedLoss <= 0.005) return "Best";
  if (expectedLoss <= 0.02) return "Excellent";
  if (expectedLoss <= 0.05) return "Good";
  if (expectedLoss <= 0.10) return "Inaccuracy";
  if (expectedLoss <= 0.20) return "Mistake";
  return "Blunder";
}

function missedOpportunityReason(input: {
  beforeFen: string;
  bestMove?: string;
  bestExpected: number;
  playedExpected: number;
  expectedLoss: number;
  bestMateMover?: number;
  actualMateMover?: number;
  previousClassification?: ReviewClassification;
}) {
  if (input.bestExpected < 0.75 || input.playedExpected > 0.60 || input.expectedLoss < 0.15) return undefined;
  if (typeof input.bestMateMover === "number" && input.bestMateMover > 0 && !(typeof input.actualMateMover === "number" && input.actualMateMover > 0)) return "missed forced mate";
  if (input.bestMove && bestMoveWinsMaterial(input.beforeFen, input.bestMove, 3)) return "missed decisive material win";
  if (input.previousClassification === "Mistake" || input.previousClassification === "Blunder") return "missed chance after opponent mistake";
  return undefined;
}

function brilliantMoveReason(input: {
  expectedLoss: number;
  bestExpected: number;
  playedExpected: number;
  actualMoveUci: string;
  bestMove?: string;
  topMoveRank?: number;
  sacrifice: SacrificeInfo;
  simpleRecapture: boolean;
  move: Move;
  topLines: ReviewLine[];
  bestMateMover?: number;
  actualMateMover?: number;
}) {
  if (input.expectedLoss > 0.02) return undefined;
  if (!input.sacrifice.isSacrifice) return undefined;
  if (input.sacrifice.materialSacrificed < 3) return undefined;
  if (input.playedExpected < 0.50) return undefined;
  if (input.bestExpected >= 0.90) return undefined;
  if (input.simpleRecapture) return undefined;
  if (input.move.captured && input.sacrifice.materialDelta >= -0.5) return undefined;
  if (input.actualMoveUci !== input.bestMove && typeof input.topMoveRank === "number" && input.topMoveRank > 2) return undefined;
  if (!hasCompensationSignal(input)) return undefined;
  return input.sacrifice.reason ?? "approved piece sacrifice with compensation";
}

export function resultCategory(scoreMover: number) {
  if (scoreMover >= 300) return "winning";
  if (scoreMover >= 100) return "better";
  if (scoreMover > -100) return "equal";
  if (scoreMover > -300) return "worse";
  return "losing";
}

function categoryRank(category: ReturnType<typeof resultCategory>) {
  const ranks = { losing: 0, worse: 1, equal: 2, better: 3, winning: 4 };
  return ranks[category];
}

function greatMoveReason(input: {
  isBook: boolean;
  expectedLoss: number;
  bestExpected: number;
  playedExpected: number;
  secondBestExpected?: number;
  thirdBestExpected?: number;
  simpleRecapture: boolean;
  move: Move;
  actualMoveUci: string;
  bestMove?: string;
  legalMoveCount: number;
  bestMateMover?: number;
  actualMateMover?: number;
}) {
  if (input.isBook || input.expectedLoss > 0.02 || input.simpleRecapture || isBasicDevelopingMove(input.move)) return undefined;
  const secondGap = typeof input.secondBestExpected === "number" ? input.bestExpected - input.secondBestExpected : 0;
  const thirdGap = typeof input.thirdBestExpected === "number" ? input.bestExpected - input.thirdBestExpected : 0;
  if (secondGap >= 0.15) return "only good move by MultiPV";
  if (input.bestExpected >= 0.70 && input.playedExpected >= 0.70 && secondGap >= 0.12) return "critical tactic; alternatives lose the advantage";
  if (input.bestExpected <= 0.50 && input.playedExpected >= 0.45 && (secondGap >= 0.12 || thirdGap >= 0.18)) return "critical defensive resource";
  if (typeof input.actualMateMover === "number" && input.actualMateMover > 0 && secondGap >= 0.12) return "forcing mate tactic with poor alternatives";
  return undefined;
}

function analyzeSacrifice(input: {
  beforeFen: string;
  afterFen: string;
  moverColor: "w" | "b";
  movedTo: string;
  actualMoveUci: string;
  expectedLoss: number;
  bestExpected: number;
  playedExpected: number;
  materialBefore: number;
  materialAfter: number;
  materialAfterOpponentBestReply?: number;
  move: Move;
}): SacrificeInfo {
  const materialDelta = (input.materialAfter - input.materialBefore) / 100;
  const movedPiece = pieceAt(input.afterFen, input.movedTo);
  const movedPieceValue = movedPiece ? materialValues[movedPiece.type] / 100 : materialValues[input.move.piece] / 100;
  const capturedValue = input.move.captured ? materialValues[input.move.captured] / 100 : 0;
  const base = { materialDelta, materialSacrificed: 0 };
  if (input.expectedLoss > 0.02) return { ...base, isSacrifice: false, rejectedReason: "engine does not approve the move enough" };
  if (input.playedExpected < 0.50) return { ...base, isSacrifice: false, rejectedReason: "player is worse after the move" };
  if (input.bestExpected >= 0.90) return { ...base, isSacrifice: false, rejectedReason: "position was already completely winning" };
  if (input.move.captured && capturedValue >= movedPieceValue) return { ...base, isSacrifice: false, rejectedReason: "equal-or-better capture is a trade, not a sacrifice" };

  if (materialDelta <= -3) {
    return { isSacrifice: true, materialDelta, materialSacrificed: Math.abs(materialDelta), reason: "material balance drops by at least a minor piece" };
  }

  const accepted = acceptedPieceSacrifice(input.afterFen, input.movedTo, input.moverColor, input.materialBefore);
  if (accepted.isSacrifice) return { ...accepted, materialDelta };

  if (typeof input.materialAfterOpponentBestReply === "number" && (input.materialAfterOpponentBestReply - input.materialBefore) / 100 <= -3) {
    return { isSacrifice: true, materialDelta, materialSacrificed: Math.max(3, movedPieceValue), reason: "engine line accepts a real piece sacrifice" };
  }

  return { ...base, isSacrifice: false, rejectedReason: accepted.rejectedReason ?? (input.move.captured ? "capture does not leave a real sacrifice" : "no real material sacrifice found") };
}

export function calculateMaterialBalance(fen: string, color: "w" | "b") {
  const chess = new Chess(fen);
  let own = 0;
  let enemy = 0;
  chess.board().forEach((row) => {
    row.forEach((piece) => {
      if (!piece) return;
      if (piece.color === color) own += materialValues[piece.type];
      else enemy += materialValues[piece.type];
    });
  });
  return own - enemy;
}

function acceptedPieceSacrifice(afterFen: string, movedTo: string, moverColor: "w" | "b", materialBefore: number): SacrificeInfo {
  const movedPiece = pieceAt(afterFen, movedTo);
  if (!movedPiece || movedPiece.color !== moverColor || movedPiece.type === "p" || movedPiece.type === "k") {
    return { isSacrifice: false, materialDelta: 0, materialSacrificed: 0, rejectedReason: "moved piece is not a sacrificable piece" };
  }

  const chess = new Chess(afterFen);
  const captures = (chess.moves({ verbose: true }) as Move[]).filter((reply) => reply.to === movedTo && Boolean(reply.captured));
  if (!captures.length) return { isSacrifice: false, materialDelta: 0, materialSacrificed: 0, rejectedReason: "opponent cannot accept a material sacrifice" };

  for (const reply of captures) {
    const line = new Chess(afterFen);
    if (!line.move({ from: reply.from, to: reply.to, promotion: reply.promotion })) continue;
    const acceptedDelta = (calculateMaterialBalance(line.fen(), moverColor) - materialBefore) / 100;
    if (acceptedDelta <= -3) {
      return {
        isSacrifice: true,
        materialDelta: acceptedDelta,
        materialSacrificed: materialValues[movedPiece.type] / 100,
        reason: "opponent can capture the sacrificed piece and win material"
      };
    }
  }
  return { isSacrifice: false, materialDelta: 0, materialSacrificed: 0, rejectedReason: "accepting the offer does not win enough material" };
}

function materialAfterBestReply(afterFen: string, moverColor: "w" | "b", replyUci?: string) {
  if (!replyUci) return undefined;
  const chess = new Chess(afterFen);
  const reply = chess.move(parseUciMove(replyUci)) as Move | null;
  if (!reply) return undefined;
  return calculateMaterialBalance(chess.fen(), moverColor);
}

function materialAfterPvReply(beforeFen: string, moverColor: "w" | "b", topLines: ReviewLine[], actualMoveUci: string) {
  const matchingLine = topLines.find((line) => line.move === actualMoveUci);
  if (!matchingLine || matchingLine.pv.length < 2) return undefined;
  const chess = new Chess(beforeFen);
  for (const uci of matchingLine.pv.slice(0, 2)) {
    const move = chess.move(parseUciMove(uci)) as Move | null;
    if (!move) return undefined;
  }
  return calculateMaterialBalance(chess.fen(), moverColor);
}

function isSimpleRecapture(previousMove: Move | null, move: Move) {
  if (!move.captured) return false;
  return Boolean(previousMove && previousMove.to === move.to && !move.san.includes("+") && !move.san.includes("#"));
}

function bestMoveWinsMaterial(beforeFen: string, bestMove: string, minimumGain: number) {
  const chess = new Chess(beforeFen);
  const moverColor = chess.turn();
  const before = calculateMaterialBalance(beforeFen, moverColor);
  const move = chess.move(parseUciMove(bestMove)) as Move | null;
  if (!move) return false;
  const gain = (calculateMaterialBalance(chess.fen(), moverColor) - before) / 100;
  const capturedValue = move.captured ? materialValues[move.captured] / 100 : 0;
  return gain >= minimumGain || capturedValue >= minimumGain;
}

function hasCompensationSignal(input: {
  actualMoveUci: string;
  move: Move;
  topLines: ReviewLine[];
  bestMateMover?: number;
  actualMateMover?: number;
  playedExpected: number;
}) {
  if (typeof input.actualMateMover === "number" && input.actualMateMover > 0) return true;
  if (typeof input.bestMateMover === "number" && input.bestMateMover > 0) return true;
  if (input.move.san.includes("+") || input.move.san.includes("#")) return true;
  const mainLine = input.topLines.find((line) => line.move === input.actualMoveUci) ?? input.topLines[0];
  if (!mainLine) return false;
  const forcingMoves = mainLine.pvSan.slice(0, 6).filter((san) => san.includes("+") || san.includes("#") || san.includes("x")).length;
  return input.playedExpected >= 0.65 && forcingMoves >= 2;
}

function isBasicDevelopingMove(move: Move) {
  if (move.captured || move.san.includes("+") || move.san.includes("#") || move.san.includes("=")) return false;
  if (move.san === "O-O" || move.san === "O-O-O") return true;
  return (move.piece === "n" || move.piece === "b") && ["3", "4", "5", "6"].includes(move.to[1]);
}

function isEndgame(fen: string) {
  const chess = new Chess(fen);
  let queens = 0;
  let nonPawnMaterial = 0;
  chess.board().forEach((row) => {
    row.forEach((piece) => {
      if (!piece) return;
      if (piece.type === "q") queens += 1;
      if (piece.type !== "p" && piece.type !== "k") nonPawnMaterial += materialValues[piece.type];
    });
  });
  return queens === 0 || nonPawnMaterial <= 2600;
}

function pieceAt(fen: string, square: string) {
  const chess = new Chess(fen);
  const files = "abcdefgh";
  for (let rowIndex = 0; rowIndex < 8; rowIndex += 1) {
    for (let fileIndex = 0; fileIndex < 8; fileIndex += 1) {
      if (`${files[fileIndex]}${8 - rowIndex}` === square) return chess.board()[rowIndex][fileIndex];
    }
  }
  return null;
}

function rankInMultiPv(actualMoveUci: string, lines: ReviewLine[]) {
  const found = lines.find((line) => line.move === actualMoveUci);
  return found?.multipv;
}

function engineLineToReviewLine(fen: string, line: EngineLine, moverColor: "w" | "b"): ReviewLine {
  return {
    multipv: line.multipv,
    move: line.move,
    san: line.move ? uciToSan(fen, line.move) : undefined,
    evaluation: compactEvaluation(line.evaluation),
    normalized: normalizeScoreToWhitePov(line.evaluation, fenTurn(fen), moverColor),
    pv: line.pv,
    pvSan: pvToSan(fen, line.pv)
  };
}

function compactEvaluation(evaluation: EngineEvaluation): EngineEvaluation {
  const { raw, ...compact } = evaluation;
  return compact;
}

function dampenDecidedPositionLoss(bestScoreMover: number, actualScoreMover: number, loss: number) {
  if (Math.abs(bestScoreMover) >= 900 && Math.abs(actualScoreMover) >= 900 && Math.sign(bestScoreMover) === Math.sign(actualScoreMover)) return loss * 0.35;
  return loss;
}

function safeCp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return clamp(value, -100000, 100000);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function averageAccuracy(moves: ReviewMove[]) {
  const analyzed = moves.filter((move) => typeof move.accuracy === "number" && !move.excludeFromAccuracyAverage);
  return analyzed.length ? analyzed.reduce((sum, move) => sum + (move.accuracy ?? 0), 0) / analyzed.length : null;
}

function buildPlayerStats(moves: ReviewMove[]): PlayerReviewStats[] {
  return ([
    ["White", "w"],
    ["Black", "b"]
  ] as const).map(([player, side]) => {
    const playerMoves = moves.filter((move) => move.side === side);
    const counts = defaultCounts();
    playerMoves.forEach((move) => {
      counts[move.classification] += 1;
    });
    const analyzed = playerMoves.filter((move) => typeof move.accuracy === "number" && !move.excludeFromAccuracyAverage);
    const accuracy = analyzed.length ? analyzed.reduce((sum, move) => sum + (move.accuracy ?? 0), 0) / analyzed.length : null;
    return { player, accuracy, analyzedMoves: analyzed.length, counts };
  });
}

function reviewProgressFromMoves(moves: ReviewMove[], total: number, message: string): ReviewProgress {
  const players = buildPlayerStats(moves).map(({ player, accuracy, analyzedMoves }) => ({ player, accuracy, analyzedMoves }));
  return {
    done: moves.length,
    total,
    message,
    gameAccuracy: averageAccuracy(moves),
    players
  };
}

function uciToSan(fen: string, uci: string) {
  const chess = new Chess(fen);
  const move = chess.move(parseUciMove(uci)) as Move | null;
  return move?.san ?? uci;
}

function pvToSan(fen: string, pv: string[]) {
  const chess = new Chess(fen);
  const san: string[] = [];
  for (const uci of pv.slice(0, 8)) {
    const move = chess.move(parseUciMove(uci)) as Move | null;
    if (!move) break;
    san.push(move.san);
  }
  return san;
}

function parseUciMove(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] };
}

function applyReviewMove(chess: Chess, initialFen: string | undefined, move: { from: string; to: string; promotion?: string }) {
  if (initialFen && isChess960Fen(initialFen)) {
    const castling = isChess960CastlingMove(chess, initialFen, move.from, move.to);
    if (castling) return executeChess960Castling(chess, initialFen, castling);
    const result = chess.move(move) as Move | null;
    if (!result) return null;
    const sanitized = sanitizeChess960FenAfterMove(result.after, initialFen, result);
    if (sanitized !== result.after) {
      chess.load(sanitized, { skipValidation: true });
      return { ...result, after: sanitized } as Move;
    }
    return result;
  }
  return chess.move(move) as Move | null;
}

function isChess960Fen(fen: string) {
  const board = fen.split(/\s+/)[0].split("/");
  return board[0] !== "rnbqkbnr" || board[7] !== "RNBQKBNR";
}

function fenTurn(fen: string): "w" | "b" {
  return fen.split(/\s+/)[1] === "b" ? "b" : "w";
}

function logAnalysisDebug(move: ReviewMove) {
  if (!analysisDebug) return;
  console.debug("[Chesstrix review]", {
    moveIndex: move.moveIndex,
    moveNumber: move.moveNumber,
    moverColor: move.moverColor,
    actualMove: move.actualMoveUci,
    label: move.label,
    rawBestScore: move.debug.rawBestScore,
    rawActualScore: move.debug.rawActualScore,
    bestScorePov: move.debug.bestScorePov,
    actualScorePov: move.debug.actualScorePov,
    fenSideToMove: move.debug.fenSideToMove,
    bestScoreWhite: move.bestScoreWhite,
    actualScoreWhite: move.actualScoreWhite,
    bestScoreMover: move.bestScoreMover,
    actualScoreMover: move.actualScoreMover,
    centipawnLoss: move.centipawnLoss,
    winPercentLoss: move.winPercentLoss,
    expectedLoss: move.debug.expectedLoss,
    bestExpected: move.debug.bestExpected,
    playedExpected: move.debug.playedExpected,
    secondBestExpected: move.debug.secondBestExpected,
    isBook: move.classification === "Book",
    isSacrifice: move.debug.sacrificeCandidate,
    materialDelta: move.debug.materialDelta,
    materialSacrificed: move.debug.materialSacrificed,
    isOnlyMove: move.debug.legalMoveCount === 1,
    greatReason: move.debug.greatReason,
    brilliantReason: move.debug.brilliantReason,
    missReason: move.debug.missReason,
    specialRejected: move.debug.specialRejected,
    accuracy: move.accuracy,
    reasons: move.reasons,
    multiPv: move.topLines.map((line) => ({ multipv: line.multipv, move: line.move, cpMover: line.normalized.cpMover, pv: line.pv.slice(0, 6) }))
  });
}

function buildResult(chess: Chess, moves: string[]) {
  const initialFen = chess.fen();
  moves.forEach((uci) => applyReviewMove(chess, initialFen, parseUciMove(uci)));
  const totalMoves = Math.ceil(moves.length / 2);
  if (chess.isCheckmate()) return { winner: chess.turn() === "w" ? "Black" as const : "White" as const, reason: "Checkmate", totalMoves };
  if (chess.isStalemate()) return { winner: "Draw" as const, reason: "Stalemate", totalMoves };
  if (chess.isInsufficientMaterial()) return { winner: "Draw" as const, reason: "Insufficient material", totalMoves };
  if (chess.isThreefoldRepetition()) return { winner: "Draw" as const, reason: "Threefold repetition", totalMoves };
  if (chess.isDraw()) return { winner: "Draw" as const, reason: "Draw", totalMoves };
  return { winner: "Unknown" as const, reason: "Resignation or unfinished game", totalMoves };
}

function buildPgn(initialFen: string | undefined, moves: string[]) {
  const chess = new Chess(initialFen);
  moves.forEach((uci) => applyReviewMove(chess, initialFen, parseUciMove(uci)));
  return chess.pgn();
}

function reviewCacheKey(moves: string[], initialFen: string | undefined, options: ReviewOptions) {
  return `chesstrix.review.${hashString(JSON.stringify({ version: reviewCacheVersion, moves, initialFen, engine: "Stockfish", depth: options.depth, multiPv: options.multiPv }))}`;
}

function loadReviewFromCache(moves: string[], initialFen: string | undefined, options: ReviewOptions) {
  const key = reviewCacheKey(moves, initialFen, options);
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as ReviewResult;
    return parsed.cacheKey === key ? parsed : null;
  } catch {
    return null;
  }
}

function saveReviewToCache(review: ReviewResult) {
  try {
    localStorage.setItem(review.cacheKey, JSON.stringify(review));
  } catch {
    // Ignore quota errors; review remains available in memory.
  }
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function parseBestMove(bestMove?: string | null) {
  return bestMove ? { from: bestMove.slice(0, 2), to: bestMove.slice(2, 4), promotion: bestMove[4] } : null;
}

export function formattedExpected(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function formattedEval(evaluation: EngineEvaluation) {
  return formatEvaluation(evaluation);
}
