import type { BotProfile } from "../game/bots/botProfiles";
import type { TournamentLaunch } from "../components/tournaments/TournamentScreen";

export type AppRoute =
  | { screen: "splash" }
  | { screen: "poster" }
  | { screen: "main-menu" }
  | { screen: "mode-selection" }
  | { screen: "bot-selection" }
  | { screen: "normal-game"; bot?: BotProfile; tournamentGame?: TournamentLaunch }
  | { screen: "puzzle-arena" }
  | { screen: "puzzle-game"; puzzleId: number }
  | { screen: "analysis" }
  | { screen: "archive" }
  | { screen: "achievements" }
  | { screen: "tournaments" }
  | { screen: "chess960" }
  | { screen: "crazyhouse" }
  | { screen: "four-player" }
  | { screen: "settings" }
  | { screen: "review"; moves?: string[]; initialFen?: string; whiteName?: string; blackName?: string; gameId?: string }
  | { screen: "result"; winner: string; result: string; moves?: string[]; initialFen?: string; whiteName?: string; blackName?: string; gameId?: string; tournamentId?: string; xpText?: string };

function getInitialRoute(): AppRoute {
  if (typeof window !== "undefined") {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path.endsWith("/poster") || hash === "#/poster" || hash === "#poster") return { screen: "poster" };
  }
  return { screen: "splash" };
}

export const initialRoute: AppRoute = getInitialRoute();
