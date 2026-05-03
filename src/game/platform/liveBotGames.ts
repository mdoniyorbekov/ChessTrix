import { defaultTimeControl, type TimeControl } from "../timeControls";
import type { Tournament, TournamentPairing } from "./tournaments";

export type LiveBotGame = {
  id: string;
  tournamentId: string;
  tournamentName: string;
  pairingId: string;
  whiteId: string;
  blackId: string;
  whiteName: string;
  blackName: string;
  timeControl: TimeControl;
  clocks: { w: number; b: number };
  moves: string[];
  fens: string[];
  status: "playing" | "completed";
  result?: "1-0" | "0-1" | "1/2-1/2";
  reason?: string;
  archiveGameId?: string;
  createdAt: string;
  updatedAt: string;
};

const liveBotGamesKey = "chesstrix.tournaments.liveBotGames";

export function getLiveBotGames() {
  return sanitizeLiveBotGames(readLiveGames());
}

export function getLiveBotGame(tournamentId: string, pairingId: string) {
  return getLiveBotGames().find((game) => game.tournamentId === tournamentId && game.pairingId === pairingId && game.status === "playing") ?? null;
}

export function saveLiveBotGame(game: LiveBotGame) {
  const games = getLiveBotGames();
  const next = [{ ...game, updatedAt: new Date().toISOString() }, ...games.filter((item) => item.id !== game.id)];
  writeLiveGames(next);
}

export function removeLiveBotGame(id: string) {
  writeLiveGames(getLiveBotGames().filter((game) => game.id !== id));
}

export function startLiveBotGame(tournament: Tournament, pairing: TournamentPairing) {
  const existing = getLiveBotGame(tournament.id, pairing.id);
  if (existing) return existing;

  const white = tournament.participants.find((participant) => participant.id === pairing.whiteId);
  const black = tournament.participants.find((participant) => participant.id === pairing.blackId);
  if (!white || !black || white.type !== "bot" || black.type !== "bot") return null;

  const baseMs = tournament.timeControl.minutes * 60 * 1000;
  const now = new Date().toISOString();
  const game: LiveBotGame = {
    id: `live-${tournament.id}-${pairing.id}`,
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    pairingId: pairing.id,
    whiteId: white.id,
    blackId: black.id,
    whiteName: white.name,
    blackName: black.name,
    timeControl: tournament.timeControl,
    clocks: { w: baseMs, b: baseMs },
    moves: [],
    fens: [],
    status: "playing",
    createdAt: now,
    updatedAt: now
  };
  saveLiveBotGame(game);
  return game;
}

function readLiveGames() {
  try {
    return JSON.parse(localStorage.getItem(liveBotGamesKey) ?? "[]") as unknown;
  } catch {
    return [];
  }
}

function writeLiveGames(games: LiveBotGame[]) {
  localStorage.setItem(liveBotGamesKey, JSON.stringify(games));
  window.dispatchEvent(new CustomEvent("chesstrix:live-bot-games", { detail: games }));
}

function sanitizeLiveBotGames(value: unknown): LiveBotGame[] {
  if (!Array.isArray(value)) return [];
  const games: LiveBotGame[] = [];
  value
    .filter((item): item is Partial<LiveBotGame> => Boolean(item) && typeof item === "object")
    .forEach((item) => {
      if (!item.id || !item.tournamentId || !item.pairingId || !item.whiteId || !item.blackId) return;
      const timeControl = item.timeControl && typeof item.timeControl.minutes === "number" ? item.timeControl : defaultTimeControl;
      const baseMs = timeControl.minutes * 60 * 1000;
      games.push({
        id: String(item.id),
        tournamentId: String(item.tournamentId),
        tournamentName: String(item.tournamentName ?? "Tournament"),
        pairingId: String(item.pairingId),
        whiteId: String(item.whiteId),
        blackId: String(item.blackId),
        whiteName: String(item.whiteName ?? "White Bot"),
        blackName: String(item.blackName ?? "Black Bot"),
        timeControl,
        clocks: {
          w: Math.max(0, Number(item.clocks?.w) || baseMs),
          b: Math.max(0, Number(item.clocks?.b) || baseMs)
        },
        moves: Array.isArray(item.moves) ? item.moves.map(String) : [],
        fens: Array.isArray(item.fens) ? item.fens.map(String) : [],
        status: item.status === "completed" ? "completed" : "playing",
        result: item.result === "1-0" || item.result === "0-1" || item.result === "1/2-1/2" ? item.result : undefined,
        reason: item.reason ? String(item.reason) : undefined,
        archiveGameId: item.archiveGameId ? String(item.archiveGameId) : undefined,
        createdAt: String(item.createdAt ?? new Date().toISOString()),
        updatedAt: String(item.updatedAt ?? new Date().toISOString())
      });
    });
  return games;
}
