import type { SavedGame } from "./archive";
import { inferHumanResult, isRewardEligibleGame } from "./archive";
import { getProfile, saveProfile } from "./profile";
import { readJson, writeJson } from "./storage";

export type AchievementRarity = "Common" | "Rare" | "Epic" | "Legendary";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  rarity: AchievementRarity;
  target: number;
  xpReward: number;
};

export type AchievementState = {
  id: string;
  progress: number;
  completed: boolean;
  unlockedAt?: string;
  rewarded: boolean;
};

export const achievements: Achievement[] = [
  { id: "first-game", name: "First Game", description: "Finish your first game.", category: "First Steps", icon: "flag", rarity: "Common", target: 1, xpReward: 20 },
  { id: "first-win", name: "First Win", description: "Win your first game.", category: "First Steps", icon: "crown", rarity: "Common", target: 1, xpReward: 30 },
  { id: "first-checkmate", name: "First Checkmate", description: "Win by checkmate.", category: "First Steps", icon: "target", rarity: "Common", target: 1, xpReward: 50 },
  { id: "first-draw", name: "First Draw", description: "Draw a game.", category: "First Steps", icon: "equal", rarity: "Common", target: 1, xpReward: 20 },
  { id: "ten-games", name: "Getting Settled", description: "Finish 10 eligible games.", category: "Consistency", icon: "layers", rarity: "Common", target: 10, xpReward: 80 },
  { id: "five-wins", name: "Five Wins", description: "Win 5 eligible games.", category: "Consistency", icon: "award", rarity: "Rare", target: 5, xpReward: 100 },
  { id: "streak-three", name: "Hot Streak", description: "Reach a 3-game win streak.", category: "Consistency", icon: "zap", rarity: "Rare", target: 3, xpReward: 90 },
  { id: "accurate-player", name: "Accurate Player", description: "Finish a reviewed game with 80%+ accuracy.", category: "Skill", icon: "gauge", rarity: "Rare", target: 1, xpReward: 40 },
  { id: "precision-mode", name: "Precision Mode", description: "Finish a reviewed game with 90%+ accuracy.", category: "Skill", icon: "crosshair", rarity: "Epic", target: 1, xpReward: 75 },
  { id: "review-first", name: "Self Scout", description: "Review your first eligible game.", category: "Skill", icon: "search", rarity: "Common", target: 1, xpReward: 25 },
  { id: "clean-game", name: "Clean Game", description: "Win a reviewed game with 90%+ accuracy.", category: "Skill", icon: "sparkles", rarity: "Rare", target: 1, xpReward: 50 },
  { id: "near-perfect", name: "Near Perfect", description: "Finish a reviewed game with 95%+ accuracy.", category: "Skill", icon: "target", rarity: "Legendary", target: 1, xpReward: 180 },
  { id: "bot-slayer", name: "Bot Slayer", description: "Beat your first bot.", category: "Bot Battles", icon: "bot", rarity: "Common", target: 1, xpReward: 30 },
  { id: "challenger", name: "Challenger", description: "Beat a 1200+ bot.", category: "Bot Battles", icon: "shield", rarity: "Rare", target: 1, xpReward: 50 },
  { id: "expert-hunter", name: "Expert Hunter", description: "Beat an 1800+ bot.", category: "Bot Battles", icon: "swords", rarity: "Epic", target: 1, xpReward: 100 },
  { id: "bullet-survivor", name: "Bullet Survivor", description: "Win a bullet game.", category: "Time Control", icon: "zap", rarity: "Rare", target: 1, xpReward: 50 },
  { id: "blitz-beast", name: "Blitz Beast", description: "Win 10 blitz games.", category: "Time Control", icon: "timer", rarity: "Epic", target: 10, xpReward: 100 },
  { id: "rapid-thinker", name: "Rapid Thinker", description: "Win 10 rapid games.", category: "Time Control", icon: "brain", rarity: "Epic", target: 10, xpReward: 100 },
  { id: "e4-player", name: "e4 Player", description: "Play 20 games starting with 1.e4.", category: "Opening", icon: "book", rarity: "Rare", target: 20, xpReward: 60 },
  { id: "d4-player", name: "d4 Player", description: "Play 20 games starting with 1.d4.", category: "Opening", icon: "book-open", rarity: "Rare", target: 20, xpReward: 60 },
  { id: "opening-explorer", name: "Opening Explorer", description: "Record 5 reviewed openings.", category: "Opening", icon: "book-open", rarity: "Rare", target: 5, xpReward: 80 },
  { id: "first-tournament", name: "First Tournament", description: "Create or join a tournament.", category: "Tournament", icon: "trophy", rarity: "Common", target: 1, xpReward: 30 },
  { id: "tournament-game", name: "On The Pairing Sheet", description: "Complete a tournament game.", category: "Tournament", icon: "medal", rarity: "Common", target: 1, xpReward: 35 },
  { id: "podium-finish", name: "Podium Finish", description: "Finish top 3 in a tournament.", category: "Tournament", icon: "medal", rarity: "Rare", target: 1, xpReward: 75 },
  { id: "champion", name: "Champion", description: "Win a tournament.", category: "Tournament", icon: "crown", rarity: "Epic", target: 1, xpReward: 150 },
  { id: "three-day-streak", name: "3-Day Streak", description: "Play on 3 different days.", category: "Consistency", icon: "calendar", rarity: "Rare", target: 3, xpReward: 60 },
  { id: "weekly-player", name: "Weekly Player", description: "Play on 7 different days.", category: "Consistency", icon: "calendar-days", rarity: "Epic", target: 7, xpReward: 140 },
  { id: "fifty-games", name: "50 Games", description: "Complete 50 games.", category: "Consistency", icon: "layers", rarity: "Epic", target: 50, xpReward: 200 },
  { id: "hundred-games", name: "100 Games", description: "Complete 100 games.", category: "Consistency", icon: "award", rarity: "Legendary", target: 100, xpReward: 400 }
];

const achievementsKey = "chesstrix.platform.achievements";
const recentKey = "chesstrix.platform.achievement-recent";

export function getAchievementStates() {
  const current = readJson<Record<string, AchievementState>>(achievementsKey, {});
  const next = { ...current };
  for (const achievement of achievements) {
    if (!next[achievement.id]) next[achievement.id] = { id: achievement.id, progress: 0, completed: false, rewarded: false };
  }
  return next;
}

export function saveAchievementStates(states: Record<string, AchievementState>) {
  writeJson(achievementsKey, states);
  window.dispatchEvent(new CustomEvent("chesstrix:achievements", { detail: states }));
}

export function getRecentUnlocks() {
  return readJson<string[]>(recentKey, []);
}

export function clearRecentUnlocks() {
  writeJson(recentKey, []);
}

export function recomputeAchievements(games: SavedGame[], tournamentSummary?: { created?: number; podiums?: number; wins?: number }) {
  const profile = getProfile();
  const states = getAchievementStates();
  const progress = buildProgressMap(games, tournamentSummary);
  const newlyUnlocked: string[] = [];
  let xpBonus = 0;

  for (const achievement of achievements) {
    const state = states[achievement.id];
    const nextProgress = Math.min(achievement.target, progress[achievement.id] ?? 0);
    if (!state.completed && nextProgress >= achievement.target) {
      states[achievement.id] = { ...state, progress: nextProgress, completed: true, unlockedAt: new Date().toISOString(), rewarded: true };
      newlyUnlocked.push(achievement.id);
      xpBonus += achievement.xpReward;
    } else {
      states[achievement.id] = { ...state, progress: Math.max(state.progress, nextProgress) };
    }
  }

  if (newlyUnlocked.length || xpBonus) {
    writeJson(recentKey, [...getRecentUnlocks(), ...newlyUnlocked].slice(-10));
    saveProfile({ ...profile, xp: profile.xp + xpBonus });
  }
  saveAchievementStates(states);
  return newlyUnlocked;
}

function buildProgressMap(games: SavedGame[], tournamentSummary?: { created?: number; podiums?: number; wins?: number }): Record<string, number> {
  const eligible = games.filter(isRewardEligibleGame);
  const wins = eligible.filter((game) => inferHumanResult(game) === "win");
  const draws = eligible.filter((game) => inferHumanResult(game) === "draw");
  const botWins = wins.filter((game) => game.whiteType === "bot" || game.blackType === "bot");
  const profile = getProfile();
  const reviewedEligible = eligible.filter((game) => game.reviewed);
  return {
    "first-game": eligible.length,
    "first-win": wins.length,
    "first-checkmate": wins.filter((game) => game.resultReason.toLowerCase().includes("checkmate")).length,
    "first-draw": draws.length,
    "ten-games": eligible.length,
    "five-wins": wins.length,
    "streak-three": profile.stats.longestStreak,
    "accurate-player": reviewedEligible.filter((game) => bestHumanAccuracy(game) >= 80).length,
    "precision-mode": reviewedEligible.filter((game) => bestHumanAccuracy(game) >= 90).length,
    "review-first": reviewedEligible.length,
    "clean-game": reviewedEligible.filter((game) => inferHumanResult(game) === "win" && bestHumanAccuracy(game) >= 90).length,
    "near-perfect": reviewedEligible.filter((game) => bestHumanAccuracy(game) >= 95).length,
    "bot-slayer": botWins.length,
    "challenger": botWins.filter((game) => (game.bot?.elo ?? 0) >= 1200).length,
    "expert-hunter": botWins.filter((game) => (game.bot?.elo ?? 0) >= 1800).length,
    "bullet-survivor": wins.filter((game) => game.tags.includes("bullet")).length,
    "blitz-beast": wins.filter((game) => game.tags.includes("blitz")).length,
    "rapid-thinker": wins.filter((game) => game.tags.includes("rapid")).length,
    "e4-player": eligible.filter((game) => game.moves[0]?.startsWith("e2e4")).length,
    "d4-player": eligible.filter((game) => game.moves[0]?.startsWith("d2d4")).length,
    "opening-explorer": reviewedEligible.filter((game) => game.opening).length,
    "first-tournament": tournamentSummary?.created ?? 0,
    "tournament-game": eligible.filter((game) => game.tournamentId).length,
    "podium-finish": tournamentSummary?.podiums ?? profile.stats.tournamentPodiums,
    champion: tournamentSummary?.wins ?? profile.stats.tournamentWins,
    "three-day-streak": profile.playedDays.length,
    "weekly-player": profile.playedDays.length,
    "fifty-games": eligible.length,
    "hundred-games": eligible.length
  };
}

function bestHumanAccuracy(game: SavedGame) {
  if (game.whiteType === "human") return game.accuracyWhite ?? 0;
  if (game.blackType === "human") return game.accuracyBlack ?? 0;
  return 0;
}
