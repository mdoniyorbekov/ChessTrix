import { createId, todayKey } from "./ids";
import { readJson, writeJson } from "./storage";

export type PlayerProfile = {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  featuredBadges: string[];
  awardedGameIds: string[];
  rewardedReviewIds: string[];
  rewardedTournamentIds: string[];
  playedDays: string[];
  stats: {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    currentStreak: number;
    longestStreak: number;
    botWins: number;
    humanWins: number;
    tournamentWins: number;
    tournamentPodiums: number;
    bestAccuracy: number | null;
    accuracySamples: number[];
  };
};

export type XpAward = {
  gameId: string;
  total: number;
  reasons: { label: string; xp: number }[];
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
};

export type CosmeticUnlock = {
  id: string;
  name: string;
  type: "Avatar" | "Board" | "Pieces";
  requirement: string;
  unlocked: boolean;
};

const profileKey = "chesstrix.platform.profile";

export const avatarOptions = ["king", "queen", "rook", "bishop", "knight", "pawn", "spark", "trophy"];

export function createDefaultProfile(): PlayerProfile {
  return {
    id: createId("player"),
    name: "ChessTrix Player",
    avatar: "king",
    xp: 0,
    featuredBadges: [],
    awardedGameIds: [],
    rewardedReviewIds: [],
    rewardedTournamentIds: [],
    playedDays: [],
    stats: {
      totalGames: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      currentStreak: 0,
      longestStreak: 0,
      botWins: 0,
      humanWins: 0,
      tournamentWins: 0,
      tournamentPodiums: 0,
      bestAccuracy: null,
      accuracySamples: []
    }
  };
}

export function getProfile() {
  return normalizeProfile(readJson<Partial<PlayerProfile>>(profileKey, createDefaultProfile()));
}

export function saveProfile(profile: PlayerProfile) {
  writeJson(profileKey, profile);
  window.dispatchEvent(new CustomEvent("chesstrix:profile", { detail: profile }));
}

export function updateProfile(patch: Partial<Pick<PlayerProfile, "name" | "avatar" | "featuredBadges">>) {
  const profile = { ...getProfile(), ...patch };
  saveProfile(profile);
  return profile;
}

export function resetProfile() {
  const profile = createDefaultProfile();
  saveProfile(profile);
  return profile;
}

export function xpRequiredForLevel(level: number) {
  return 100 + level * level * 25;
}

export function levelFromXp(xp: number) {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpRequiredForLevel(level)) {
    remaining -= xpRequiredForLevel(level);
    level += 1;
  }
  return { level, currentXp: remaining, requiredXp: xpRequiredForLevel(level) };
}

export function titleForLevel(level: number) {
  if (level >= 30) return "Grand Strategist";
  if (level >= 25) return "ChessTrix Master";
  if (level >= 20) return "Candidate Mastermind";
  if (level >= 16) return "Endgame Survivor";
  if (level >= 12) return "Sharp Attacker";
  if (level >= 8) return "Club Player";
  if (level >= 5) return "Tactic Finder";
  if (level >= 3) return "Pawn Pusher";
  return "Newcomer";
}

export type GameXpContext = {
  id: string;
  resultForHuman: "win" | "loss" | "draw" | "spectator";
  moveCount: number;
  reason: string;
  opponentType: "human" | "bot";
  opponentElo?: number;
  playerEstimatedElo?: number;
  accuracy?: number | null;
  tournamentId?: string;
};

export function applyCompletedGameToProfile(context: GameXpContext): XpAward | null {
  const profile = getProfile();
  if (profile.awardedGameIds.includes(context.id) || context.resultForHuman === "spectator" || context.moveCount < 16) return null;

  const oldLevel = levelFromXp(profile.xp).level;
  const reasons: { label: string; xp: number }[] = [];
  const fullMoves = Math.floor(context.moveCount / 2);
  if (fullMoves >= 8) {
    reasons.push({ label: "Completed game", xp: 20 });
  }
  if (context.resultForHuman === "win") reasons.push({ label: "Win", xp: 40 });
  if (context.resultForHuman === "draw") reasons.push({ label: "Draw", xp: 25 });
  if (context.resultForHuman === "loss") reasons.push({ label: "Played to finish", xp: 10 });
  if (context.resultForHuman === "win" && context.opponentType === "bot" && (context.opponentElo ?? 0) > (context.playerEstimatedElo ?? 1200)) {
    reasons.push({ label: "Stronger bot defeated", xp: 20 });
  }
  if (context.resultForHuman === "win" && context.reason.toLowerCase().includes("checkmate")) reasons.push({ label: "Checkmate win", xp: 15 });
  if (context.accuracy != null && context.accuracy >= 95) reasons.push({ label: "95%+ accuracy", xp: 40 });
  else if (context.accuracy != null && context.accuracy >= 90) reasons.push({ label: "90%+ accuracy", xp: 25 });
  else if (context.accuracy != null && context.accuracy >= 80) reasons.push({ label: "80%+ accuracy", xp: 10 });

  const total = reasons.reduce((sum, item) => sum + item.xp, 0);
  const nextStats = { ...profile.stats };
  nextStats.totalGames += 1;
  if (context.resultForHuman === "win") {
    nextStats.wins += 1;
    nextStats.currentStreak += 1;
    nextStats.longestStreak = Math.max(nextStats.longestStreak, nextStats.currentStreak);
    if (context.opponentType === "bot") nextStats.botWins += 1;
    else nextStats.humanWins += 1;
    if (nextStats.currentStreak === 3) reasons.push({ label: "3-game streak", xp: 15 });
    if (nextStats.currentStreak === 5) reasons.push({ label: "5-game streak", xp: 30 });
    if (nextStats.currentStreak === 10) reasons.push({ label: "10-game streak", xp: 75 });
  } else {
    nextStats.currentStreak = 0;
    if (context.resultForHuman === "draw") nextStats.draws += 1;
    if (context.resultForHuman === "loss") nextStats.losses += 1;
  }
  if (context.accuracy != null) {
    nextStats.bestAccuracy = Math.max(nextStats.bestAccuracy ?? 0, context.accuracy);
    nextStats.accuracySamples = [...nextStats.accuracySamples, context.accuracy].slice(-200);
  }

  const playedDays = Array.from(new Set([...profile.playedDays, todayKey()]));
  const finalTotal = reasons.reduce((sum, item) => sum + item.xp, 0);
  const updated = {
    ...profile,
    xp: profile.xp + finalTotal,
    awardedGameIds: [...profile.awardedGameIds, context.id],
    playedDays,
    stats: nextStats
  };
  saveProfile(updated);

  const newLevel = levelFromXp(updated.xp).level;
  return { gameId: context.id, total: finalTotal, reasons, leveledUp: newLevel > oldLevel, oldLevel, newLevel };
}

export function applyReviewAccuracyToProfile(gameId: string, accuracy: number | null) {
  if (accuracy == null) return;
  const profile = getProfile();
  if (profile.rewardedReviewIds.includes(gameId)) return;
  saveProfile({
    ...profile,
    rewardedReviewIds: [...profile.rewardedReviewIds, gameId],
    stats: {
      ...profile.stats,
      bestAccuracy: Math.max(profile.stats.bestAccuracy ?? 0, accuracy),
      accuracySamples: [...profile.stats.accuracySamples, accuracy].slice(-200)
    }
  });
}

export function applyTournamentReward(tournamentId: string, placement: number) {
  const profile = getProfile();
  if (profile.rewardedTournamentIds.includes(tournamentId)) return null;
  const bonus = placement === 1 ? 100 : placement <= 3 ? 50 : 0;
  const stats = {
    ...profile.stats,
    tournamentWins: profile.stats.tournamentWins + (placement === 1 ? 1 : 0),
    tournamentPodiums: profile.stats.tournamentPodiums + (placement <= 3 ? 1 : 0)
  };
  saveProfile({
    ...profile,
    xp: profile.xp + bonus,
    rewardedTournamentIds: [...profile.rewardedTournamentIds, tournamentId],
    stats
  });
  return bonus;
}

export function cosmeticUnlocks(profile = getProfile()): CosmeticUnlock[] {
  const level = levelFromXp(profile.xp).level;
  return [
    { id: "avatar-spark", name: "Spark Avatar", type: "Avatar", requirement: "Reach Level 3", unlocked: level >= 3 },
    { id: "avatar-trophy", name: "Trophy Avatar", type: "Avatar", requirement: "Win a tournament", unlocked: profile.stats.tournamentWins > 0 },
    { id: "board-tournament", name: "Tournament Board", type: "Board", requirement: "Finish on a podium", unlocked: profile.stats.tournamentPodiums > 0 },
    { id: "board-neon", name: "Neon Board", type: "Board", requirement: "Reach Level 8", unlocked: level >= 8 },
    { id: "pieces-vintage", name: "Vintage Pieces", type: "Pieces", requirement: "Win 5 games", unlocked: profile.stats.wins >= 5 },
    { id: "pieces-tournament", name: "Tournament Pieces", type: "Pieces", requirement: "Reach Level 12", unlocked: level >= 12 }
  ];
}

function normalizeProfile(profile: Partial<PlayerProfile>): PlayerProfile {
  const fallback = createDefaultProfile();
  const stats = { ...fallback.stats, ...(profile.stats ?? {}) };
  return {
    ...fallback,
    ...profile,
    id: profile.id ?? fallback.id,
    name: typeof profile.name === "string" && profile.name.trim() ? profile.name : fallback.name,
    avatar: typeof profile.avatar === "string" ? profile.avatar : fallback.avatar,
    xp: Math.max(0, Number(profile.xp) || 0),
    featuredBadges: Array.isArray(profile.featuredBadges) ? profile.featuredBadges.map(String).slice(0, 3) : [],
    awardedGameIds: Array.isArray(profile.awardedGameIds) ? profile.awardedGameIds.map(String) : [],
    rewardedReviewIds: Array.isArray(profile.rewardedReviewIds) ? profile.rewardedReviewIds.map(String) : [],
    rewardedTournamentIds: Array.isArray(profile.rewardedTournamentIds) ? profile.rewardedTournamentIds.map(String) : [],
    playedDays: Array.isArray(profile.playedDays) ? profile.playedDays.map(String) : [],
    stats: {
      totalGames: Math.max(0, Number(stats.totalGames) || 0),
      wins: Math.max(0, Number(stats.wins) || 0),
      losses: Math.max(0, Number(stats.losses) || 0),
      draws: Math.max(0, Number(stats.draws) || 0),
      currentStreak: Math.max(0, Number(stats.currentStreak) || 0),
      longestStreak: Math.max(0, Number(stats.longestStreak) || 0),
      botWins: Math.max(0, Number(stats.botWins) || 0),
      humanWins: Math.max(0, Number(stats.humanWins) || 0),
      tournamentWins: Math.max(0, Number(stats.tournamentWins) || 0),
      tournamentPodiums: Math.max(0, Number(stats.tournamentPodiums) || 0),
      bestAccuracy: typeof stats.bestAccuracy === "number" ? stats.bestAccuracy : null,
      accuracySamples: Array.isArray(stats.accuracySamples) ? stats.accuracySamples.filter((value): value is number => typeof value === "number").slice(-200) : []
    }
  };
}
