/// <reference types="vite/client" />

import type { EngineAnalysis, EngineEvaluation } from "./game/engine/evaluation";
import type { BotProfile } from "./game/bots/botProfiles";

declare global {
  interface Window {
    chesstrixEngine?: {
      init: () => Promise<{ available: boolean; message?: string; path?: string }>;
      isAvailable: () => Promise<{ available: boolean; message?: string; path?: string }>;
      setDifficulty: (profile: Partial<BotProfile>) => Promise<{ available: boolean; message?: string }>;
      bestMove: (
        position: { fen?: string; moves?: string[]; chess960?: boolean },
        options: { depth?: number; moveTimeMs?: number; chess960?: boolean; elo?: number; skillLevel?: number }
      ) => Promise<{ available: boolean; bestMove?: string; evaluation?: EngineEvaluation; message?: string }>;
      evaluation: (
        position: { fen?: string; moves?: string[]; chess960?: boolean },
        options: { depth?: number; moveTimeMs?: number; chess960?: boolean }
      ) => Promise<{ available: boolean; evaluation?: EngineEvaluation; message?: string; raw?: string }>;
      analysis: (
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
        }
      ) => Promise<{
        available: boolean;
        bestMove?: string;
        evaluation: EngineEvaluation;
        lines?: EngineAnalysis["lines"];
        depth?: number;
        message?: string;
        raw?: string;
        requestId?: string;
        moveIndex?: number;
        fen?: string;
        multiPv?: number;
        requestedMove?: string;
      }>;
      stop: () => Promise<{ ok: boolean }>;
      quit: () => Promise<{ ok: boolean }>;
    };
  }
}
