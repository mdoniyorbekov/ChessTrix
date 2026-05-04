import type { BotProfile } from "../bots/botProfiles";
import type { EngineAnalysis, EngineEvaluation } from "./evaluation";

const missingMessage = "Stockfish engine not found. Please install it or set STOCKFISH_PATH.";

export async function getEngineStatus() {
  if (!window.chesstrixEngine) {
    return { available: false, message: "Electron engine bridge is unavailable in browser preview." };
  }
  return window.chesstrixEngine.isAvailable();
}

export async function setEngineDifficulty(profile: BotProfile) {
  if (!window.chesstrixEngine) return { available: false, message: missingMessage };
  return window.chesstrixEngine.setDifficulty(profile);
}

export async function requestBestMove(
  position: { fen?: string; moves?: string[]; chess960?: boolean },
  options: { depth?: number; moveTimeMs?: number; chess960?: boolean; elo?: number; skillLevel?: number } = {}
) {
  if (!window.chesstrixEngine) return { available: false, message: missingMessage };
  return window.chesstrixEngine.bestMove(position, options);
}

export async function requestEvaluation(
  position: { fen?: string; moves?: string[]; chess960?: boolean },
  options: { depth?: number; moveTimeMs?: number; chess960?: boolean } = {}
): Promise<{ available: boolean; evaluation?: EngineEvaluation; message?: string }> {
  if (!window.chesstrixEngine) return { available: false, message: missingMessage };
  return window.chesstrixEngine.evaluation(position, options);
}

export async function requestAnalysis(
  position: { fen?: string; moves?: string[]; chess960?: boolean },
  options: {
    depth?: number;
    moveTimeMs?: number;
    chess960?: boolean;
    multiPv?: number;
    threads?: number;
    hashMb?: number;
    showWdl?: boolean;
    searchMoves?: string[];
    requestId?: string;
    moveIndex?: number;
    timeoutMs?: number;
  } = {}
): Promise<{ available: boolean; analysis?: EngineAnalysis; message?: string }> {
  if (!window.chesstrixEngine) return { available: false, message: missingMessage };
  const response = await window.chesstrixEngine.analysis(position, options);
  if (!response.available) return response;
  return {
    available: true,
    analysis: {
      evaluation: response.evaluation,
      bestMove: response.bestMove,
      lines: response.lines ?? [],
      depth: response.depth ?? response.evaluation?.depth ?? 0,
      raw: response.raw,
      requestId: response.requestId,
      moveIndex: response.moveIndex,
      fen: response.fen,
      multiPv: response.multiPv,
      requestedMove: response.requestedMove
    }
  };
}
