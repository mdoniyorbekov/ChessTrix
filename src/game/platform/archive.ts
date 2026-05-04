import { Chess } from "chess.js";
import type { BotProfile } from "../bots/botProfiles";
import { isUciMove } from "../engine/uciParser";
import { formatTimeControl, type TimeControl } from "../timeControls";
import { createId } from "./ids";
import { applyCompletedGameToProfile, applyReviewAccuracyToProfile, type XpAward } from "./profile";
import { readJson, writeJson } from "./storage";

export type SavedGame = {
  id: string;
  createdAt: string;
  white: string;
  black: string;
  whiteType: "human" | "bot";
  blackType: "human" | "bot";
  bot?: { name: string; elo: number; style: string };
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
  resultReason: string;
  winner: string;
  timeControl: TimeControl;
  tournamentId?: string;
  tournamentName?: string;
  pairingId?: string;
  pgn: string;
  finalFen: string;
  initialFen?: string;
  moves: string[];
  moveCount: number;
  durationSeconds?: number;
  accuracyWhite?: number;
  accuracyBlack?: number;
  opening?: string;
  eco?: string;
  tags: string[];
  favorite: boolean;
  reviewed: boolean;
  xpAward?: XpAward | null;
};

export type CompletedGameInput = {
  winner: string;
  resultReason: string;
  moves: string[];
  initialFen?: string;
  whiteName: string;
  blackName: string;
  whiteType?: "human" | "bot";
  blackType?: "human" | "bot";
  bot?: BotProfile;
  timeControl: TimeControl;
  tournamentId?: string;
  tournamentName?: string;
  pairingId?: string;
  forceId?: string;
};

const archiveKey = "chesstrix.platform.archive";

export function getGames() {
  return sanitizeGames(readJson<unknown>(archiveKey, []));
}

export function saveGames(games: SavedGame[]) {
  const sanitized = dedupeGames(sanitizeGames(games));
  writeJson(archiveKey, sanitized);
  window.dispatchEvent(new CustomEvent("chesstrix:archive", { detail: sanitized }));
}

export function getGame(id: string) {
  return getGames().find((game) => game.id === id);
}

export function deleteGame(id: string) {
  saveGames(getGames().filter((game) => game.id !== id));
}

export function toggleFavoriteGame(id: string) {
  const games = getGames().map((game) => (game.id === id ? { ...game, favorite: !game.favorite } : game));
  saveGames(games);
}

export function updateGameReview(
  id: string,
  review: { accuracyWhite?: number; accuracyBlack?: number; opening?: string; eco?: string }
) {
  const games = getGames();
  const game = games.find((item) => item.id === id);
  if (!game) return;
  const updated = {
    ...game,
    ...review,
    reviewed: true,
    tags: Array.from(new Set([...game.tags, "reviewed"]))
  };
  saveGames(games.map((item) => (item.id === id ? updated : item)));
  applyReviewAccuracyToProfile(id, bestHumanAccuracy(updated));
}

export function saveCompletedGame(input: CompletedGameInput) {
  const existing = getGames();
  const cleanInput = { ...input, moves: cleanUciMoves(input.moves) };
  const duplicate = existing.find((game) => isDuplicateGame(game, cleanInput));
  if (duplicate) return duplicate;
  const id = cleanInput.forceId ?? createId("game");
  const pgnData = buildPgn(cleanInput);
  const result = resultCode(cleanInput.winner);
  const tags = buildGameTags(cleanInput, result);
  const saved: SavedGame = {
    id,
    createdAt: new Date().toISOString(),
    white: cleanInput.whiteName,
    black: cleanInput.blackName,
    whiteType: cleanInput.whiteType ?? "human",
    blackType: cleanInput.blackType ?? (cleanInput.bot ? "bot" : "human"),
    bot: cleanInput.bot ? { name: cleanInput.bot.name, elo: cleanInput.bot.elo, style: cleanInput.bot.style } : undefined,
    result,
    resultReason: cleanInput.resultReason,
    winner: cleanInput.winner,
    timeControl: cleanInput.timeControl,
    tournamentId: cleanInput.tournamentId,
    tournamentName: cleanInput.tournamentName,
    pairingId: cleanInput.pairingId,
    pgn: pgnData.pgn,
    finalFen: pgnData.finalFen,
    initialFen: cleanInput.initialFen,
    moves: cleanInput.moves,
    moveCount: cleanInput.moves.length,
    tags,
    favorite: false,
    reviewed: false
  };

  const resultForHuman = inferHumanResult(saved);
  const xpAward = isRewardEligibleGame(saved)
    ? applyCompletedGameToProfile({
        id,
        resultForHuman,
        moveCount: saved.moveCount,
        reason: cleanInput.resultReason,
        opponentType: saved.whiteType === "bot" || saved.blackType === "bot" ? "bot" : "human",
        opponentElo: cleanInput.bot?.elo,
        tournamentId: cleanInput.tournamentId
      })
    : null;
  saved.xpAward = xpAward;
  saveGames([saved, ...existing]);
  return saved;
}

export function buildPgn(input: CompletedGameInput) {
  const chess = new Chess(input.initialFen);
  for (const uci of input.moves) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.slice(4, 5) || undefined;
    try {
      chess.move({ from, to, promotion });
    } catch {
      break;
    }
  }
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ".");
  const result = resultCode(input.winner);
  const tags = [
    `[Event "${input.tournamentName ?? "ChessTrix Casual Game"}"]`,
    `[Site "ChessTrix Local"]`,
    `[Date "${date}"]`,
    `[White "${escapePgn(input.whiteName)}"]`,
    `[Black "${escapePgn(input.blackName)}"]`,
    `[Result "${result}"]`,
    `[TimeControl "${formatTimeControl(input.timeControl)}"]`,
    `[Termination "${escapePgn(input.resultReason)}"]`
  ];
  return { pgn: `${tags.join("\n")}\n\n${chess.pgn()} ${result}`.trim(), finalFen: chess.fen() };
}

export function resultCode(winner: string): SavedGame["result"] {
  const lowered = winner.toLowerCase();
  if (lowered.includes("white")) return "1-0";
  if (lowered.includes("black")) return "0-1";
  if (lowered.includes("draw")) return "1/2-1/2";
  return "*";
}

export function inferHumanResult(game: SavedGame): "win" | "loss" | "draw" | "spectator" {
  const humanColor = game.whiteType === "human" ? "white" : game.blackType === "human" ? "black" : null;
  if (!humanColor) return "spectator";
  if (game.result === "1/2-1/2") return "draw";
  if (game.result === "1-0") return humanColor === "white" ? "win" : "loss";
  if (game.result === "0-1") return humanColor === "black" ? "win" : "loss";
  return "draw";
}

export function isRewardEligibleGame(game: SavedGame) {
  if (inferHumanResult(game) === "spectator") return false;
  if (game.result === "*") return false;
  if (game.moveCount < 16) return false;
  if (game.resultReason.toLowerCase().includes("manual")) return false;
  return true;
}

export function calculateArchiveStats(games: SavedGame[]) {
  const validGames = sanitizeGames(games);
  const humanGames = validGames.filter((game) => inferHumanResult(game) !== "spectator");
  const wins = humanGames.filter((game) => inferHumanResult(game) === "win").length;
  const losses = humanGames.filter((game) => inferHumanResult(game) === "loss").length;
  const draws = humanGames.filter((game) => inferHumanResult(game) === "draw").length;
  const whiteGames = humanGames.filter((game) => game.whiteType === "human");
  const blackGames = humanGames.filter((game) => game.blackType === "human");
  const whiteWins = whiteGames.filter((game) => game.result === "1-0").length;
  const blackWins = blackGames.filter((game) => game.result === "0-1").length;
  const reviewed = games.filter((game) => game.reviewed);
  const humanAccuracies = reviewed
    .map((game) => humanAccuracy(game))
    .filter((value): value is number => typeof value === "number");
  const moveCounts = validGames.map((game) => game.moveCount);
  const openingCounts = countBy(validGames.map((game) => game.opening).filter(Boolean) as string[]);
  const reasonCounts = countBy(validGames.map((game) => game.resultReason));
  const botCounts = countBy(validGames.map((game) => game.bot?.name).filter(Boolean) as string[]);
  const openingRows = Object.keys(openingCounts).map((opening) => {
    const openingGames = humanGames.filter((game) => game.opening === opening);
    const openingWins = openingGames.filter((game) => inferHumanResult(game) === "win").length;
    return { opening, games: openingGames.length, winRate: openingGames.length ? (openingWins / openingGames.length) * 100 : 0 };
  });
  const bestOpening = openingRows.filter((row) => row.games >= 2).sort((a, b) => b.winRate - a.winRate || b.games - a.games)[0]?.opening ?? "None";
  const worstOpening = openingRows.filter((row) => row.games >= 2).sort((a, b) => a.winRate - b.winRate || b.games - a.games)[0]?.opening ?? "None";
  const beatenBots = humanGames.filter((game) => inferHumanResult(game) === "win" && game.bot);
  const strongestBotBeaten = beatenBots.sort((a, b) => (b.bot?.elo ?? 0) - (a.bot?.elo ?? 0))[0]?.bot?.name ?? "None";
  return {
    total: validGames.length,
    humanGames: humanGames.length,
    wins,
    losses,
    draws,
    winRate: humanGames.length ? (wins / humanGames.length) * 100 : 0,
    whiteGames: whiteGames.length,
    blackGames: blackGames.length,
    whiteWins,
    blackWins,
    whiteWinRate: whiteGames.length ? (whiteWins / whiteGames.length) * 100 : 0,
    blackWinRate: blackGames.length ? (blackWins / blackGames.length) * 100 : 0,
    mostPlayedColor: whiteGames.length === blackGames.length ? "Even" : whiteGames.length > blackGames.length ? "White" : "Black",
    averageAccuracy: humanAccuracies.length ? humanAccuracies.reduce((sum, value) => sum + value, 0) / humanAccuracies.length : null,
    bestAccuracy: humanAccuracies.length ? Math.max(...humanAccuracies) : null,
    averageMoves: moveCounts.length ? moveCounts.reduce((sum, value) => sum + value, 0) / moveCounts.length : 0,
    longestGame: moveCounts.length ? Math.max(...moveCounts) : 0,
    shortestGame: moveCounts.length ? Math.min(...moveCounts) : 0,
    commonReason: topEntry(reasonCounts),
    commonOpening: topEntry(openingCounts),
    bestOpening,
    worstOpening,
    mostPlayedBot: topEntry(botCounts),
    strongestBotBeaten,
    botGames: validGames.filter((game) => game.whiteType === "bot" || game.blackType === "bot").length,
    tournamentGames: validGames.filter((game) => game.tournamentId).length
  };
}

function sanitizeGames(value: unknown): SavedGame[] {
  if (!Array.isArray(value)) return [];
  return dedupeGames(
    value
      .filter((game): game is Partial<SavedGame> => Boolean(game) && typeof game === "object")
      .map((game) => normalizeGame(game))
      .filter((game): game is SavedGame => Boolean(game))
  );
}

function normalizeGame(game: Partial<SavedGame>): SavedGame | null {
  if (!game.id || !game.createdAt || !Array.isArray(game.moves)) return null;
  const timeControl = game.timeControl && typeof game.timeControl.minutes === "number" ? game.timeControl : { id: "unknown", name: "Unknown", minutes: 10, incrementSeconds: 0 };
  return {
    id: String(game.id),
    createdAt: String(game.createdAt),
    white: String(game.white ?? "White Player"),
    black: String(game.black ?? "Black Player"),
    whiteType: game.whiteType === "bot" ? "bot" : "human",
    blackType: game.blackType === "bot" ? "bot" : "human",
    bot: game.bot,
    result: game.result === "1-0" || game.result === "0-1" || game.result === "1/2-1/2" || game.result === "*" ? game.result : "*",
    resultReason: String(game.resultReason ?? "Game over"),
    winner: String(game.winner ?? "Draw"),
    timeControl,
    tournamentId: game.tournamentId,
    tournamentName: game.tournamentName,
    pairingId: game.pairingId,
    pgn: String(game.pgn ?? ""),
    finalFen: String(game.finalFen ?? ""),
    initialFen: game.initialFen,
    moves: cleanUciMoves(game.moves.map(String)),
    moveCount: cleanUciMoves(game.moves.map(String)).length,
    durationSeconds: game.durationSeconds,
    accuracyWhite: typeof game.accuracyWhite === "number" ? game.accuracyWhite : undefined,
    accuracyBlack: typeof game.accuracyBlack === "number" ? game.accuracyBlack : undefined,
    opening: game.opening,
    eco: game.eco,
    tags: Array.isArray(game.tags) ? game.tags.map(String) : [],
    favorite: Boolean(game.favorite),
    reviewed: Boolean(game.reviewed),
    xpAward: game.xpAward ?? null
  };
}

function cleanUciMoves(moves: string[]) {
  return moves.filter(isUciMove).map((move) => move.toLowerCase());
}

function dedupeGames(games: SavedGame[]) {
  const seen = new Set<string>();
  return games.filter((game) => {
    const key = game.pairingId ? `pairing:${game.pairingId}` : gameFingerprint(game);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isDuplicateGame(game: SavedGame, input: CompletedGameInput) {
  if (input.pairingId && game.pairingId === input.pairingId) return true;
  if (input.forceId && game.id === input.forceId) return true;
  return gameFingerprint(game) === inputFingerprint(input);
}

function gameFingerprint(game: SavedGame) {
  return `${game.white}|${game.black}|${game.result}|${game.initialFen ?? "start"}|${game.moves.join(" ")}`;
}

function inputFingerprint(input: CompletedGameInput) {
  return `${input.whiteName}|${input.blackName}|${resultCode(input.winner)}|${input.initialFen ?? "start"}|${input.moves.join(" ")}`;
}

function humanAccuracy(game: SavedGame) {
  if (game.whiteType === "human") return game.accuracyWhite;
  if (game.blackType === "human") return game.accuracyBlack;
  return undefined;
}

function buildGameTags(input: CompletedGameInput, result: SavedGame["result"]) {
  const tags = [timeFormatTag(input.timeControl), result === "1/2-1/2" ? "draw" : "decisive"];
  if (input.bot) tags.push("bot game");
  else tags.push("human game");
  if (input.tournamentId) tags.push("tournament");
  return tags;
}

function timeFormatTag(control: TimeControl) {
  if (control.minutes <= 2) return "bullet";
  if (control.minutes <= 5) return "blitz";
  if (control.minutes <= 15) return "rapid";
  return "classical";
}

function bestHumanAccuracy(game: SavedGame) {
  if (game.whiteType === "human" && typeof game.accuracyWhite === "number") return game.accuracyWhite;
  if (game.blackType === "human" && typeof game.accuracyBlack === "number") return game.accuracyBlack;
  return null;
}

function countBy(items: string[]) {
  return items.reduce<Record<string, number>>((map, item) => {
    map[item] = (map[item] ?? 0) + 1;
    return map;
  }, {});
}

function topEntry(map: Record<string, number>) {
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None";
}

function escapePgn(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, "'");
}
