import { defaultCountryCode, getCountryByCode } from "../../data/countries";

export type BotGender = "male" | "female" | "other";

export type BotProfile = {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  gender: BotGender;
  elo: number;
  skillLevel: number;
  moveTimeMs: number;
  blunderChance: number;
  style: string;
  description: string;
  avatarDataUrl?: string;
};

export type BotDraft = Omit<BotProfile, "id">;

const customBotsKey = "chesstrix.customBots";

export const defaultBotDraft: BotDraft = {
  name: "Campus Bot",
  countryCode: defaultCountryCode,
  countryName: getCountryByCode(defaultCountryCode).name,
  gender: "other",
  elo: 1500,
  skillLevel: 6,
  moveTimeMs: 500,
  blunderChance: 0.1,
  style: "Balanced",
  description: "A custom offline Stockfish bot.",
  avatarDataUrl: undefined
};

export function getCustomBots(): BotProfile[] {
  const saved = localStorage.getItem(customBotsKey);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved) as BotProfile[];
    return parsed.map(normalizeBot).filter(Boolean) as BotProfile[];
  } catch {
    return [];
  }
}

export function saveCustomBot(draft: BotDraft) {
  const bots = getCustomBots();
  const bot = normalizeBot({
    ...draft,
    id: `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  });
  const next = [...bots, bot];
  saveCustomBots(next);
  return bot;
}

export function updateCustomBot(id: string, draft: BotDraft) {
  const bots = getCustomBots();
  const existing = bots.find((bot) => bot.id === id);
  if (!existing) return null;

  const bot = normalizeBot({ ...existing, ...draft, id });
  saveCustomBots(bots.map((item) => (item.id === id ? bot : item)));
  return bot;
}

export function deleteCustomBot(id: string) {
  saveCustomBots(getCustomBots().filter((bot) => bot.id !== id));
}

export function saveCustomBots(bots: BotProfile[]) {
  localStorage.setItem(customBotsKey, JSON.stringify(bots));
  window.dispatchEvent(new CustomEvent("chesstrix:bots", { detail: bots }));
}

function normalizeBot(bot: BotProfile): BotProfile {
  const country = getCountryByCode(bot.countryCode);

  return {
    id: bot.id,
    name: bot.name.trim() || "Custom Bot",
    countryCode: country.code,
    countryName: country.name,
    gender: bot.gender ?? "other",
    elo: clamp(Math.round(Number(bot.elo) || 1500), 1320, 3190),
    skillLevel: clamp(Math.round(Number(bot.skillLevel) || 6), 0, 20),
    moveTimeMs: clamp(Math.round(Number(bot.moveTimeMs) || 500), 100, 5000),
    blunderChance: clamp(Number(bot.blunderChance) || 0, 0, 0.5),
    style: bot.style.trim() || "Balanced",
    description: bot.description.trim() || "A custom offline Stockfish bot.",
    avatarDataUrl: bot.avatarDataUrl
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
