export type ScorePov = "sideToMove" | "white";

export type EngineEvaluation = {
  type: "cp" | "mate";
  value: number;
  pov?: ScorePov;
  depth: number;
  raw?: string;
  rawValue?: number;
  rawPov?: ScorePov;
  fenSideToMove?: "w" | "b";
  wdl?: { wins: number; draws: number; losses: number };
};

export type EngineLine = {
  multipv: number;
  move?: string;
  evaluation: EngineEvaluation;
  pv: string[];
  raw?: string;
};

export type EngineAnalysis = {
  evaluation: EngineEvaluation;
  bestMove?: string;
  lines: EngineLine[];
  depth: number;
  raw?: string;
  requestId?: string;
  moveIndex?: number;
  fen?: string;
  multiPv?: number;
  requestedMove?: string;
};

export function formatEvaluation(evaluation?: EngineEvaluation | null) {
  if (!evaluation) return "0.0";
  if (evaluation.type === "mate") {
    return `${evaluation.value < 0 ? "-" : ""}M${Math.abs(evaluation.value)}`;
  }
  const pawns = evaluation.value / 100;
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(1)}`;
}

export function evaluationStatus(evaluation?: EngineEvaluation | null) {
  if (!evaluation) return "Engine idle";
  if (evaluation.type === "mate") {
    return evaluation.value > 0 ? "White mating" : "Black mating";
  }
  const pawns = evaluation.value / 100;
  const abs = Math.abs(pawns);
  if (abs < 0.35) return "Equal";
  if (abs < 1.2) return pawns > 0 ? "White slightly better" : "Black slightly better";
  if (abs < 3) return pawns > 0 ? "White better" : "Black better";
  return pawns > 0 ? "White winning" : "Black winning";
}

export function evaluationFillPercent(evaluation?: EngineEvaluation | null) {
  if (!evaluation) return 50;
  if (evaluation.type === "mate") {
    return evaluation.value > 0 ? 96 : 4;
  }
  const pawns = Math.max(-5, Math.min(5, evaluation.value / 100));
  return 50 + pawns * 10;
}

export function evaluationToNumber(evaluation?: EngineEvaluation | null) {
  if (!evaluation) return 0;
  if (evaluation.type === "mate") return evaluation.value > 0 ? 100000 - Math.abs(evaluation.value) : -100000 + Math.abs(evaluation.value);
  return evaluation.value;
}
