import { getCustomBots } from "../bots/botProfiles";
import { defaultTimeControl, type TimeControl } from "../timeControls";
import { createId } from "./ids";
import { readJson, writeJson } from "./storage";

export type TournamentFormat = "round-robin" | "knockout" | "swiss";

export type TournamentParticipant = {
  id: string;
  name: string;
  type: "human" | "bot";
  rating: number;
  avatar?: string;
  botId?: string;
};

export type TournamentPairing = {
  id: string;
  round: number;
  whiteId?: string;
  blackId?: string;
  status: "pending" | "in-progress" | "completed" | "bye" | "needs-tiebreak";
  result?: "1-0" | "0-1" | "1/2-1/2" | "bye";
  gameId?: string;
};

export type Tournament = {
  id: string;
  name: string;
  format: TournamentFormat;
  status: "setup" | "ongoing" | "completed" | "canceled";
  timeControl: TimeControl;
  swissRounds: number;
  participants: TournamentParticipant[];
  pairings: TournamentPairing[];
  currentRound: number;
  createdAt: string;
  completedAt?: string;
};

export type TournamentStanding = {
  participant: TournamentParticipant;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  byes: number;
  buchholz: number;
  blackWins: number;
};

const tournamentsKey = "chesstrix.platform.tournaments";

export function getTournaments() {
  return sanitizeTournaments(readJson<unknown>(tournamentsKey, []));
}

export function saveTournaments(tournaments: Tournament[]) {
  writeJson(tournamentsKey, tournaments);
  window.dispatchEvent(new CustomEvent("chesstrix:tournaments", { detail: tournaments }));
}

export function getTournament(id: string) {
  return getTournaments().find((tournament) => tournament.id === id);
}

export function saveTournament(tournament: Tournament) {
  const tournaments = getTournaments();
  saveTournaments([tournament, ...tournaments.filter((item) => item.id !== tournament.id)]);
}

export function createTournament(input: {
  name: string;
  format: TournamentFormat;
  timeControl?: TimeControl;
  swissRounds?: number;
  participants: TournamentParticipant[];
}) {
  const tournament: Tournament = {
    id: createId("tour"),
    name: input.name.trim() || "ChessTrix Cup",
    format: input.format,
    status: "ongoing",
    timeControl: input.timeControl ?? defaultTimeControl,
    swissRounds: input.swissRounds ?? suggestedSwissRounds(input.participants.length),
    participants: normalizeParticipants(input.participants),
    pairings: [],
    currentRound: 1,
    createdAt: new Date().toISOString()
  };
  tournament.pairings = generateInitialPairings(tournament);
  saveTournament(tournament);
  return tournament;
}

export function createHuman(name: string): TournamentParticipant {
  return { id: createId("tp"), name: name.trim() || "Local Player", type: "human", rating: 1200, avatar: "king" };
}

export function createBotParticipant(name: string, rating: number, botId?: string): TournamentParticipant {
  return { id: createId("tp"), name, type: "bot", rating, botId, avatar: "bot" };
}

export function suggestedSwissRounds(count: number) {
  if (count <= 4) return 3;
  if (count <= 8) return 4;
  if (count <= 16) return 5;
  return 6;
}

export function fillBots(count: number, strength: "beginner" | "mixed" | "strong" = "mixed") {
  const saved = getCustomBots();
  const fallback = [
    { id: "fallback-1", name: "Nova Bot", elo: 850 },
    { id: "fallback-2", name: "Tempo Bot", elo: 1050 },
    { id: "fallback-3", name: "Fork Finder", elo: 1280 },
    { id: "fallback-4", name: "Endgame Echo", elo: 1500 },
    { id: "fallback-5", name: "Sharp Bishop", elo: 1720 },
    { id: "fallback-6", name: "Iron Rook", elo: 1950 },
    { id: "fallback-7", name: "Quiet Queen", elo: 2150 },
    { id: "fallback-8", name: "Deep Knight", elo: 2350 }
  ];
  const pool = saved.length ? saved.map((bot) => ({ id: bot.id, name: bot.name, elo: bot.elo })) : fallback;
  const filtered = pool.filter((bot) => {
    if (strength === "beginner") return bot.elo <= 1300;
    if (strength === "strong") return bot.elo >= 1500;
    return true;
  });
  const source = filtered.length ? filtered : pool;
  return Array.from({ length: count }, (_, index) => {
    const bot = source[index % source.length];
    return createBotParticipant(`${bot.name}${index >= source.length ? ` ${Math.floor(index / source.length) + 1}` : ""}`, bot.elo, bot.id);
  });
}

export function standingsFor(tournament: Tournament): TournamentStanding[] {
  const base = tournament.participants.map<TournamentStanding>((participant) => ({
    participant,
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    byes: 0,
    buchholz: 0,
    blackWins: 0
  }));
  const map = new Map(base.map((standing) => [standing.participant.id, standing]));
  for (const pairing of tournament.pairings.filter((item) => item.status === "completed" || item.status === "bye")) {
    if (pairing.result === "bye" && pairing.whiteId) {
      const standing = map.get(pairing.whiteId);
      if (standing) {
        standing.points += 1;
        standing.wins += 1;
        standing.byes += 1;
      }
      continue;
    }
    const white = pairing.whiteId ? map.get(pairing.whiteId) : undefined;
    const black = pairing.blackId ? map.get(pairing.blackId) : undefined;
    if (!white || !black) continue;
    if (pairing.result === "1-0") {
      white.points += 1;
      white.wins += 1;
      black.losses += 1;
    } else if (pairing.result === "0-1") {
      black.points += 1;
      black.wins += 1;
      black.blackWins += 1;
      white.losses += 1;
    } else if (pairing.result === "1/2-1/2") {
      white.points += 0.5;
      black.points += 0.5;
      white.draws += 1;
      black.draws += 1;
    }
  }
  for (const standing of base) {
    const opponents = tournament.pairings
      .filter((pairing) => pairing.status === "completed" && (pairing.whiteId === standing.participant.id || pairing.blackId === standing.participant.id))
      .map((pairing) => (pairing.whiteId === standing.participant.id ? pairing.blackId : pairing.whiteId))
      .filter(Boolean) as string[];
    standing.buchholz = opponents.reduce((sum, opponentId) => sum + (map.get(opponentId)?.points ?? 0), 0);
  }
  return base.sort((a, b) => b.points - a.points || b.buchholz - a.buchholz || b.wins - a.wins || b.blackWins - a.blackWins || b.participant.rating - a.participant.rating);
}

export function recordPairingResult(tournamentId: string, pairingId: string, result: TournamentPairing["result"], gameId?: string) {
  const tournament = getTournament(tournamentId);
  if (!tournament || !result) return null;
  const existing = tournament.pairings.find((pairing) => pairing.id === pairingId);
  if (existing?.status === "completed" && existing.result === result && existing.gameId === gameId) return tournament;
  let next: Tournament = {
    ...tournament,
    pairings: tournament.pairings.map((pairing) => (pairing.id === pairingId ? { ...pairing, result, gameId, status: result === "1/2-1/2" && tournament.format === "knockout" ? "needs-tiebreak" : "completed" } : pairing))
  };
  next = maybeAdvanceTournament(next);
  saveTournament(next);
  return next;
}

export function markPairingInProgress(tournamentId: string, pairingId: string, gameId?: string) {
  const tournament = getTournament(tournamentId);
  if (!tournament) return null;
  const next: Tournament = {
    ...tournament,
    pairings: tournament.pairings.map((pairing) => (
      pairing.id === pairingId && (pairing.status === "pending" || pairing.status === "needs-tiebreak")
        ? { ...pairing, status: "in-progress", gameId }
        : pairing
    ))
  };
  saveTournament(next);
  return next;
}

function generateInitialPairings(tournament: Tournament) {
  if (tournament.format === "round-robin") return generateRoundRobin(tournament.participants);
  if (tournament.format === "knockout") return generateKnockoutRound(tournament.participants, 1);
  return generateSwissRound(tournament, 1);
}

function generateRoundRobin(participants: TournamentParticipant[]) {
  const players = [...participants];
  if (players.length % 2) players.push({ id: "bye", name: "Bye", type: "bot", rating: 0 });
  const rounds: TournamentPairing[] = [];
  const count = players.length;
  for (let round = 1; round < count; round += 1) {
    for (let index = 0; index < count / 2; index += 1) {
      const a = players[index];
      const b = players[count - 1 - index];
      if (a.id === "bye" || b.id === "bye") {
        const player = a.id === "bye" ? b : a;
        rounds.push({ id: createId("pair"), round, whiteId: player.id, status: "bye", result: "bye" });
      } else {
        const aWhiteCount = rounds.filter((pairing) => pairing.whiteId === a.id).length;
        const bWhiteCount = rounds.filter((pairing) => pairing.whiteId === b.id).length;
        const flip = aWhiteCount > bWhiteCount || (aWhiteCount === bWhiteCount && round % 2 === 0);
        rounds.push({ id: createId("pair"), round, whiteId: flip ? b.id : a.id, blackId: flip ? a.id : b.id, status: "pending" });
      }
    }
    players.splice(1, 0, players.pop() as TournamentParticipant);
  }
  return rounds;
}

function generateKnockoutRound(participants: TournamentParticipant[], round: number) {
  const size = nextPowerOfTwo(participants.length);
  const seeded = [...participants].sort((a, b) => b.rating - a.rating);
  const pairings: TournamentPairing[] = [];
  for (let index = 0; index < size / 2; index += 1) {
    const white = seeded[index];
    const black = seeded[size - 1 - index];
    if (white && black) pairings.push({ id: createId("pair"), round, whiteId: white.id, blackId: black.id, status: "pending" });
    else if (white) pairings.push({ id: createId("pair"), round, whiteId: white.id, status: "bye", result: "bye" });
  }
  return pairings;
}

function generateSwissRound(tournament: Tournament, round: number) {
  const standings = standingsFor(tournament);
  const used = new Set<string>();
  const hadBye = new Set(tournament.pairings.filter((pairing) => pairing.result === "bye" && pairing.whiteId).map((pairing) => pairing.whiteId as string));
  const pairings: TournamentPairing[] = [];
  const players = standings.map((standing) => standing.participant);
  if (players.length % 2) {
    const bye = [...standings].reverse().find((standing) => !hadBye.has(standing.participant.id))?.participant ?? players[players.length - 1];
    used.add(bye.id);
    pairings.push({ id: createId("pair"), round, whiteId: bye.id, status: "bye", result: "bye" });
  }
  for (const player of players) {
    if (used.has(player.id)) continue;
    const opponent = players.find((candidate) => !used.has(candidate.id) && candidate.id !== player.id && !havePlayed(tournament, player.id, candidate.id));
    const fallback = players.find((candidate) => !used.has(candidate.id) && candidate.id !== player.id);
    const paired = opponent ?? fallback;
    if (!paired) continue;
    used.add(player.id);
    used.add(paired.id);
    const playerColor = colorBalance(tournament, player.id);
    const pairedColor = colorBalance(tournament, paired.id);
    const playerShouldBeWhite = playerColor <= pairedColor;
    pairings.push({ id: createId("pair"), round, whiteId: playerShouldBeWhite ? player.id : paired.id, blackId: playerShouldBeWhite ? paired.id : player.id, status: "pending" });
  }
  return pairings;
}

function maybeAdvanceTournament(tournament: Tournament): Tournament {
  const pendingCurrent = tournament.pairings.some((pairing) => pairing.round === tournament.currentRound && (pairing.status === "pending" || pairing.status === "in-progress" || pairing.status === "needs-tiebreak"));
  if (pendingCurrent) return tournament;

  if (tournament.format === "round-robin") {
    const lastRound = Math.max(...tournament.pairings.map((pairing) => pairing.round));
    return tournament.currentRound >= lastRound ? completeTournament(tournament) : { ...tournament, currentRound: tournament.currentRound + 1 };
  }
  if (tournament.format === "swiss") {
    if (tournament.currentRound >= tournament.swissRounds) return completeTournament(tournament);
    const nextRound = tournament.currentRound + 1;
    return { ...tournament, currentRound: nextRound, pairings: [...tournament.pairings, ...generateSwissRound(tournament, nextRound)] };
  }
  const winners = tournament.pairings
    .filter((pairing) => pairing.round === tournament.currentRound)
    .map((pairing) => knockoutWinnerId(pairing))
    .filter(Boolean)
    .map((id) => tournament.participants.find((participant) => participant.id === id))
    .filter(Boolean) as TournamentParticipant[];
  if (winners.length <= 1) return completeTournament(tournament);
  const nextRound = tournament.currentRound + 1;
  return { ...tournament, currentRound: nextRound, pairings: [...tournament.pairings, ...generateKnockoutRound(winners, nextRound)] };
}

function completeTournament(tournament: Tournament): Tournament {
  return { ...tournament, status: "completed", completedAt: new Date().toISOString() };
}

function knockoutWinnerId(pairing: TournamentPairing) {
  if (pairing.result === "bye") return pairing.whiteId;
  if (pairing.result === "1-0") return pairing.whiteId;
  if (pairing.result === "0-1") return pairing.blackId;
  return undefined;
}

function havePlayed(tournament: Tournament, a: string, b: string) {
  return tournament.pairings.some((pairing) => pairing.status === "completed" && ((pairing.whiteId === a && pairing.blackId === b) || (pairing.whiteId === b && pairing.blackId === a)));
}

function colorBalance(tournament: Tournament, participantId: string) {
  return tournament.pairings.reduce((sum, pairing) => {
    if (pairing.whiteId === participantId) return sum + 1;
    if (pairing.blackId === participantId) return sum - 1;
    return sum;
  }, 0);
}

function nextPowerOfTwo(value: number) {
  let size = 1;
  while (size < value) size *= 2;
  return size;
}

function normalizeParticipants(participants: TournamentParticipant[]) {
  const names = new Map<string, number>();
  return participants.map((participant) => {
    const baseName = (participant.name.trim() || (participant.type === "bot" ? "Tournament Bot" : "Local Player")).slice(0, 32);
    const key = baseName.toLowerCase();
    const count = names.get(key) ?? 0;
    names.set(key, count + 1);
    return {
      ...participant,
      name: count ? `${baseName} ${count + 1}` : baseName,
      rating: Math.max(100, Math.min(3500, Math.round(Number(participant.rating) || 1200)))
    };
  });
}

function sanitizeTournaments(value: unknown): Tournament[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<Tournament> => Boolean(item) && typeof item === "object")
    .map((item) => normalizeTournament(item))
    .filter((item): item is Tournament => Boolean(item));
}

function normalizeTournament(item: Partial<Tournament>): Tournament | null {
  if (!item.id || !Array.isArray(item.participants) || !Array.isArray(item.pairings)) return null;
  const format: TournamentFormat = item.format === "knockout" || item.format === "swiss" ? item.format : "round-robin";
  const status = item.status === "setup" || item.status === "completed" || item.status === "canceled" ? item.status : "ongoing";
  return {
    id: String(item.id),
    name: String(item.name ?? "ChessTrix Cup"),
    format,
    status,
    timeControl: item.timeControl ?? defaultTimeControl,
    swissRounds: Math.max(1, Number(item.swissRounds) || suggestedSwissRounds(item.participants.length)),
    participants: normalizeParticipants(item.participants as TournamentParticipant[]),
    pairings: item.pairings.map((pairing) => ({ ...pairing, id: String(pairing.id), round: Number(pairing.round) || 1 })) as TournamentPairing[],
    currentRound: Math.max(1, Number(item.currentRound) || 1),
    createdAt: String(item.createdAt ?? new Date().toISOString()),
    completedAt: item.completedAt
  };
}
