import { Chess } from "chess.js";
import { Bot, Calendar, Check, Crown, Eye, Medal, Play, Plus, RotateCcw, Swords, Trophy, Users, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCustomBots, type BotProfile } from "../../game/bots/botProfiles";
import { getBotMove } from "../../game/bots/botMoveService";
import { getGames, saveCompletedGame } from "../../game/platform/archive";
import { recomputeAchievements } from "../../game/platform/achievements";
import { getLiveBotGames, removeLiveBotGame, saveLiveBotGame, startLiveBotGame, type LiveBotGame } from "../../game/platform/liveBotGames";
import {
  createBotParticipant,
  createHuman,
  createTournament,
  fillBots,
  getTournaments,
  markPairingInProgress,
  recordPairingResult,
  saveTournament,
  standingsFor,
  type Tournament,
  type TournamentFormat,
  type TournamentPairing,
  type TournamentParticipant
} from "../../game/platform/tournaments";
import { applyTournamentReward } from "../../game/platform/profile";
import { defaultTimeControl, formatClock, formatTimeControl, timeControlPresets, type TimeControl } from "../../game/timeControls";
import { ChessBoard } from "../board/ChessBoard";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import "./tournaments.css";

export type TournamentLaunch = {
  tournamentId: string;
  tournamentName: string;
  pairingId: string;
  whiteName: string;
  blackName: string;
  whiteType: "human" | "bot";
  blackType: "human" | "bot";
  bot?: BotProfile;
  humanColor?: "w" | "b";
  timeControl: TimeControl;
};

type TournamentScreenProps = {
  onPlayPairing: (launch: TournamentLaunch) => void;
};

export function TournamentScreen({ onPlayPairing }: TournamentScreenProps) {
  const [tournaments, setTournaments] = useState(getTournaments);
  const [liveBotGames, setLiveBotGames] = useState(getLiveBotGames);
  const [selectedId, setSelectedId] = useState<string | null>(tournaments.find((item) => item.status === "ongoing")?.id ?? tournaments[0]?.id ?? null);
  const [viewingLiveGameId, setViewingLiveGameId] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const selected = tournaments.find((item) => item.id === selectedId) ?? null;
  const viewedLiveGame = liveBotGames.find((game) => game.id === viewingLiveGameId) ?? null;

  useEffect(() => {
    const update = () => {
      setTournaments(getTournaments());
      setLiveBotGames(getLiveBotGames());
    };
    window.addEventListener("chesstrix:tournaments", update);
    window.addEventListener("chesstrix:live-bot-games", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("chesstrix:tournaments", update);
      window.removeEventListener("chesstrix:live-bot-games", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const refresh = () => {
    const next = getTournaments();
    setTournaments(next);
    setLiveBotGames(getLiveBotGames());
    if (!selectedId) setSelectedId(next[0]?.id ?? null);
  };

  return (
    <div className="tournament-screen">
      <section className="tournament-home">
        <Card className="tournament-hero">
          <div>
            <h2><Trophy /> Tournament Mode</h2>
            <p>Create cups, register humans and bots, play pairings, simulate bot games, and resume everything later.</p>
          </div>
          <Button icon={<Plus />} onClick={() => setSetupOpen(true)}>Create Tournament</Button>
        </Card>

        {setupOpen && <TournamentSetup onCancel={() => setSetupOpen(false)} onCreated={(tournament) => { setSetupOpen(false); setSelectedId(tournament.id); refresh(); }} />}

        <div className="tournament-list">
          {tournaments.map((tournament) => (
            <button key={tournament.id} className={`tournament-list-item ${selected?.id === tournament.id ? "active" : ""}`} onClick={() => setSelectedId(tournament.id)}>
              <strong>{tournament.name}</strong>
              <span>{labelFormat(tournament.format)} · {tournament.participants.length} players · {formatTimeControl(tournament.timeControl)}</span>
              <Badge tone={tournament.status === "completed" ? "success" : "accent"}>{tournament.status}</Badge>
            </button>
          ))}
          {!tournaments.length && !setupOpen && <Card>No tournaments yet. Create a quick cup and let the board earn its trophies.</Card>}
        </div>
      </section>

      <section className="tournament-dashboard">
        {selected ? (
          <TournamentDashboard
            tournament={selected}
            liveBotGames={liveBotGames}
            viewedLiveGame={viewedLiveGame}
            onRefresh={refresh}
            onPlayPairing={onPlayPairing}
            onViewLiveGame={setViewingLiveGameId}
          />
        ) : <QuickStarts onCreated={(tournament) => { setSelectedId(tournament.id); refresh(); }} />}
      </section>
    </div>
  );
}

function TournamentSetup({ onCancel, onCreated }: { onCancel: () => void; onCreated: (tournament: Tournament) => void }) {
  const [name, setName] = useState("ChessTrix Cup");
  const [format, setFormat] = useState<TournamentFormat>("round-robin");
  const [timeControlId, setTimeControlId] = useState(defaultTimeControl.id);
  const [swissRounds, setSwissRounds] = useState(4);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([createHuman("ChessTrix Player")]);
  const [humanName, setHumanName] = useState("");
  const [fillStrength, setFillStrength] = useState<"beginner" | "mixed" | "strong">("mixed");
  const bots = getCustomBots();
  const timeControl = timeControlPresets.find((preset) => preset.id === timeControlId) ?? defaultTimeControl;

  const addBot = (bot: BotProfile) => setParticipants((current) => [...current, createBotParticipant(bot.name, bot.elo, bot.id)]);
  const updateParticipant = (id: string, patch: Partial<TournamentParticipant>) => {
    setParticipants((current) => current.map((participant) => participant.id === id ? { ...participant, ...patch } : participant));
  };
  const canCreate = participants.length >= (format === "round-robin" ? 3 : format === "swiss" ? 4 : 2);

  return (
    <Card className="tournament-setup">
      <h3>Create Tournament</h3>
      <div className="setup-grid">
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Format
          <select value={format} onChange={(event) => setFormat(event.target.value as TournamentFormat)}>
            <option value="round-robin">Round Robin</option>
            <option value="knockout">Single Elimination</option>
            <option value="swiss">Swiss System</option>
          </select>
        </label>
        <label>Time Control
          <select value={timeControlId} onChange={(event) => setTimeControlId(event.target.value)}>
            {timeControlPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
          </select>
        </label>
        {format === "swiss" && <label>Rounds<input type="number" min={1} max={9} value={swissRounds} onChange={(event) => setSwissRounds(Number(event.target.value))} /></label>}
      </div>
      <div className="participant-tools">
        <label>Add human<input value={humanName} onChange={(event) => setHumanName(event.target.value)} placeholder="Name" /></label>
        <Button variant="secondary" icon={<Users />} onClick={() => { setParticipants((current) => [...current, createHuman(humanName)]); setHumanName(""); }}>Add Human</Button>
        <label>Bot strength
          <select value={fillStrength} onChange={(event) => setFillStrength(event.target.value as "beginner" | "mixed" | "strong")}>
            <option value="beginner">Beginner</option>
            <option value="mixed">Mixed</option>
            <option value="strong">Strong</option>
          </select>
        </label>
        <Button variant="secondary" icon={<Bot />} onClick={() => setParticipants((current) => [...current, ...fillBots(4, fillStrength)])}>Add 4 Bots</Button>
        <Button variant="secondary" icon={<Zap />} onClick={() => setParticipants((current) => [...current, ...fillBots(Math.max(0, 8 - current.length), fillStrength)])}>Fill to 8</Button>
      </div>
      {!!bots.length && (
        <div className="bot-palette">
          {bots.map((bot) => <button key={bot.id} onClick={() => addBot(bot)}><Bot /> {bot.name} <small>{bot.elo}</small></button>)}
        </div>
      )}
      <div className="participant-grid">
        {participants.map((participant) => (
          <div key={participant.id} className="participant-chip">
            <span>{participant.type === "bot" ? <Bot /> : <Users />}</span>
            <input value={participant.name} onChange={(event) => updateParticipant(participant.id, { name: event.target.value })} maxLength={32} />
            <input type="number" min={100} max={3500} value={participant.rating} onChange={(event) => updateParticipant(participant.id, { rating: Number(event.target.value) })} />
            <button onClick={() => setParticipants((current) => current.filter((item) => item.id !== participant.id))}>Remove</button>
          </div>
        ))}
      </div>
      <div className="tournament-actions">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button icon={<Play />} disabled={!canCreate} onClick={() => onCreated(createTournament({ name, format, participants, timeControl, swissRounds }))}>Start Tournament</Button>
      </div>
      {!canCreate && <Badge tone="danger">Need more players for {labelFormat(format)}</Badge>}
    </Card>
  );
}

function TournamentDashboard({
  tournament,
  liveBotGames,
  viewedLiveGame,
  onRefresh,
  onPlayPairing,
  onViewLiveGame
}: {
  tournament: Tournament;
  liveBotGames: LiveBotGame[];
  viewedLiveGame: LiveBotGame | null;
  onRefresh: () => void;
  onPlayPairing: (launch: TournamentLaunch) => void;
  onViewLiveGame: (id: string | null) => void;
}) {
  const standings = useMemo(() => standingsFor(tournament), [tournament]);
  const currentPairings = tournament.pairings.filter((pairing) => pairing.round === tournament.currentRound);
  const allPairings = tournament.pairings;
  const liveByPairing = useMemo(() => new Map(liveBotGames.map((game) => [game.pairingId, game])), [liveBotGames]);

  useEffect(() => {
    if (tournament.status === "completed") {
      const humanPlacement = standings.findIndex((standing) => standing.participant.type === "human") + 1;
      if (humanPlacement > 0 && humanPlacement <= 3) applyTournamentReward(tournament.id, humanPlacement);
      recomputeAchievements(getGames(), {
        created: getTournaments().length,
        podiums: humanPlacement > 0 && humanPlacement <= 3 ? 1 : 0,
        wins: humanPlacement === 1 ? 1 : 0
      });
    }
  }, [standings, tournament]);

  const play = (pairing: TournamentPairing) => {
    const white = tournament.participants.find((participant) => participant.id === pairing.whiteId);
    const black = tournament.participants.find((participant) => participant.id === pairing.blackId);
    if (!white || !black) return;
    const botParticipant = white.type === "bot" ? white : black.type === "bot" ? black : undefined;
    const bot = botParticipant ? botProfileFor(botParticipant) : undefined;
    onPlayPairing({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      pairingId: pairing.id,
      whiteName: white.name,
      blackName: black.name,
      whiteType: white.type,
      blackType: black.type,
      bot,
      humanColor: white.type === "human" ? "w" : "b",
      timeControl: tournament.timeControl
    });
  };

  const simulate = (pairing: TournamentPairing) => {
    const liveGame = startLiveBotGame(tournament, pairing);
    if (!liveGame) return;
    markPairingInProgress(tournament.id, pairing.id, liveGame.id);
    onRefresh();
    advanceLiveBotGamesOnce(onRefresh);
  };

  const view = (pairing: TournamentPairing) => {
    const liveGame = liveByPairing.get(pairing.id) ?? startLiveBotGame(tournament, pairing);
    if (!liveGame) return;
    markPairingInProgress(tournament.id, pairing.id, liveGame.id);
    onViewLiveGame(liveGame.id);
    onRefresh();
    advanceLiveBotGamesOnce(onRefresh);
  };

  const manual = (pairing: TournamentPairing, result: "1-0" | "0-1" | "1/2-1/2") => {
    const white = tournament.participants.find((participant) => participant.id === pairing.whiteId);
    const black = tournament.participants.find((participant) => participant.id === pairing.blackId);
    if (!white || !black) return;
    const game = saveCompletedGame({
      winner: result === "1-0" ? "White wins" : result === "0-1" ? "Black wins" : "Draw",
      resultReason: "Manual tournament result",
      moves: [],
      whiteName: white.name,
      blackName: black.name,
      whiteType: white.type,
      blackType: black.type,
      timeControl: tournament.timeControl,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      pairingId: pairing.id
    });
    recordPairingResult(tournament.id, pairing.id, result, game.id);
    recomputeAchievements(getGames());
    onRefresh();
  };

  const reset = () => {
    if (!confirm("Cancel this tournament? Saved games stay in the archive.")) return;
    saveTournament({ ...tournament, status: "canceled" });
    onRefresh();
  };

  return (
    <div className="tournament-dash">
      <Card className="tournament-summary">
        <div>
          <h2>{tournament.name}</h2>
          <p>{labelFormat(tournament.format)} · Round {tournament.currentRound} · {formatTimeControl(tournament.timeControl)}</p>
        </div>
        <Badge tone={tournament.status === "completed" ? "success" : "accent"}>{tournament.status}</Badge>
        {tournament.status !== "completed" && <Button variant="danger" icon={<RotateCcw />} onClick={reset}>Cancel</Button>}
      </Card>

      {tournament.status === "completed" && (
        <Card className="champion-card">
          <Crown />
          <div>
            <h3>{standings[0]?.participant.name ?? "Champion"}</h3>
            <p>Champion of {tournament.name}</p>
          </div>
        </Card>
      )}

      {tournament.status === "completed" && (
        <Card className="completed-summary">
          <h3><Trophy /> Completed Summary</h3>
          <div>
            {standings.slice(0, 3).map((standing, index) => (
              <span key={standing.participant.id}><strong>#{index + 1}</strong> {standing.participant.name} · {standing.points} pts</span>
            ))}
          </div>
        </Card>
      )}

      <Card className="pairing-card">
        <h3><Swords /> Current Pairings</h3>
        {currentPairings.map((pairing) => (
          <PairingRow
            key={pairing.id}
            tournament={tournament}
            pairing={pairing}
            liveGame={liveByPairing.get(pairing.id)}
            onPlay={() => play(pairing)}
            onSimulate={() => simulate(pairing)}
            onView={() => view(pairing)}
            onManual={(result) => manual(pairing, result)}
          />
        ))}
      </Card>

      {viewedLiveGame && <LiveBotGameViewer game={viewedLiveGame} onClose={() => onViewLiveGame(null)} />}

      <Card className="standings-card">
        <h3><Medal /> Standings</h3>
        <table>
          <thead><tr><th>#</th><th>Player</th><th>Pts</th><th>W</th><th>D</th><th>L</th><th>Buchholz</th></tr></thead>
          <tbody>
            {standings.map((standing, index) => (
              <tr key={standing.participant.id}>
                <td>{index + 1}</td>
                <td>{standing.participant.name} <small>{standing.participant.type}</small></td>
                <td>{standing.points}</td>
                <td>{standing.wins}</td>
                <td>{standing.draws}</td>
                <td>{standing.losses}</td>
                <td>{standing.buchholz}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="pairing-card">
        <h3><Calendar /> All Rounds</h3>
        {tournament.format === "knockout" && <BracketView tournament={tournament} />}
        {allPairings.map((pairing) => <PairingMini key={pairing.id} tournament={tournament} pairing={pairing} />)}
      </Card>
    </div>
  );
}

function PairingRow({
  tournament,
  pairing,
  liveGame,
  onPlay,
  onSimulate,
  onView,
  onManual
}: {
  tournament: Tournament;
  pairing: TournamentPairing;
  liveGame?: LiveBotGame;
  onPlay: () => void;
  onSimulate: () => void;
  onView: () => void;
  onManual: (result: "1-0" | "0-1" | "1/2-1/2") => void;
}) {
  const white = tournament.participants.find((participant) => participant.id === pairing.whiteId);
  const black = tournament.participants.find((participant) => participant.id === pairing.blackId);
  const botOnly = white?.type === "bot" && black?.type === "bot";
  if (pairing.status === "bye") return <div className="pairing-row"><strong>{white?.name}</strong><Badge tone="success">Bye +1</Badge></div>;
  return (
    <div className="pairing-row">
      <div><strong>{white?.name}</strong><span>vs</span><strong>{black?.name}</strong></div>
      <Badge tone={pairing.status === "completed" ? "success" : pairing.status === "needs-tiebreak" ? "danger" : "muted"}>{pairing.result ?? pairing.status}</Badge>
      {(pairing.status === "pending" || pairing.status === "needs-tiebreak") && (
        <div className="pairing-actions">
          {!botOnly && <Button variant="secondary" icon={<Play />} onClick={onPlay}>Play</Button>}
          {botOnly && <Button variant="secondary" icon={<Bot />} onClick={onSimulate}>Simulate</Button>}
          {botOnly && <Button variant="ghost" icon={<Eye />} onClick={onView}>View</Button>}
          <Button variant="ghost" icon={<Check />} onClick={() => onManual("1-0")}>1-0</Button>
          <Button variant="ghost" onClick={() => onManual("1/2-1/2")}>Draw</Button>
          <Button variant="ghost" onClick={() => onManual("0-1")}>0-1</Button>
        </div>
      )}
      {pairing.status === "in-progress" && botOnly && (
        <div className="pairing-actions">
          <Button variant="secondary" icon={<Eye />} onClick={onView}>View</Button>
          <Badge tone="info">{liveGame ? `${liveGame.moves.length} ply` : "Live"}</Badge>
        </div>
      )}
    </div>
  );
}

const liveBotGamesInFlight = new Set<string>();

export function useLiveBotGameRunner(onRefresh: () => void = () => undefined) {
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const tick = () => advanceLiveBotGamesOnce(onRefreshRef.current);
    tick();
    const timer = window.setInterval(tick, 900);
    return () => window.clearInterval(timer);
  }, []);
}

function advanceLiveBotGamesOnce(onRefresh: () => void) {
  getLiveBotGames()
    .filter((game) => game.status === "playing")
    .forEach((game) => {
      void advanceLiveBotGame(game, onRefresh);
    });
}

async function advanceLiveBotGame(game: LiveBotGame, onRefresh: () => void) {
  if (liveBotGamesInFlight.has(game.id)) return;
  liveBotGamesInFlight.add(game.id);
  try {
    const tournament = getTournaments().find((item) => item.id === game.tournamentId);
    const pairing = tournament?.pairings.find((item) => item.id === game.pairingId);
    const white = tournament?.participants.find((participant) => participant.id === game.whiteId);
    const black = tournament?.participants.find((participant) => participant.id === game.blackId);
    if (!tournament || !pairing || !white || !black || white.type !== "bot" || black.type !== "bot") {
      removeLiveBotGame(game.id);
      onRefresh();
      return;
    }
    if (pairing.status === "completed" || pairing.status === "bye") {
      removeLiveBotGame(game.id);
      onRefresh();
      return;
    }

    const chess = chessFromUciMoves(game.moves);
    const terminal = gameTerminal(chess, game);
    if (terminal) {
      finishLiveBotGame(game, terminal.result, terminal.reason, onRefresh);
      return;
    }

    const side = chess.turn();
    const botParticipant = side === "w" ? white : black;
    const bot = botProfileFor(botParticipant);
    const startedAt = Date.now();
    const move = await getBotMove(new Chess(chess.fen()), bot);
    const elapsed = Date.now() - startedAt;
    const displayDelay = Math.max(0, Math.min(1100, bot.moveTimeMs) - elapsed);
    if (displayDelay > 0) await delay(displayDelay);

    const freshGame = getLiveBotGames().find((item) => item.id === game.id);
    if (!freshGame || freshGame.status !== "playing" || freshGame.moves.length !== game.moves.length) return;
    if (!move) {
      finishLiveBotGame(freshGame, "1/2-1/2", "No legal moves", onRefresh);
      return;
    }

    const result = chess.move({ from: move.from, to: move.to, promotion: move.promotion });
    if (!result) return;

    const spentMs = Math.max(100, Date.now() - startedAt);
    const nextClock = Math.max(0, freshGame.clocks[side] - spentMs);
    const nextClocks = {
      ...freshGame.clocks,
      [side]: nextClock > 0 ? nextClock + freshGame.timeControl.incrementSeconds * 1000 : 0
    };
    const nextGame: LiveBotGame = {
      ...freshGame,
      moves: [...freshGame.moves, `${result.from}${result.to}${result.promotion ?? ""}`],
      fens: [...freshGame.fens, result.after],
      clocks: nextClocks
    };
    saveLiveBotGame(nextGame);

    if (nextClock <= 0) {
      finishLiveBotGame(nextGame, side === "w" ? "0-1" : "1-0", `${side === "w" ? "White" : "Black"} lost on time`, onRefresh);
      return;
    }
    const nextTerminal = gameTerminal(chess, nextGame);
    if (nextTerminal) finishLiveBotGame(nextGame, nextTerminal.result, nextTerminal.reason, onRefresh);
  } finally {
    liveBotGamesInFlight.delete(game.id);
  }
}

function finishLiveBotGame(game: LiveBotGame, result: "1-0" | "0-1" | "1/2-1/2", reason: string, onRefresh: () => void) {
  const saved = saveCompletedGame({
    winner: result === "1-0" ? "White wins" : result === "0-1" ? "Black wins" : "Draw",
    resultReason: reason,
    moves: game.moves,
    whiteName: game.whiteName,
    blackName: game.blackName,
    whiteType: "bot",
    blackType: "bot",
    timeControl: game.timeControl,
    tournamentId: game.tournamentId,
    tournamentName: game.tournamentName,
    pairingId: game.pairingId
  });
  recordPairingResult(game.tournamentId, game.pairingId, result, saved.id);
  removeLiveBotGame(game.id);
  recomputeAchievements(getGames());
  onRefresh();
}

function gameTerminal(chess: Chess, game: LiveBotGame) {
  if (game.clocks.w <= 0) return { result: "0-1" as const, reason: "White lost on time" };
  if (game.clocks.b <= 0) return { result: "1-0" as const, reason: "Black lost on time" };
  if (chess.isCheckmate()) return { result: chess.turn() === "w" ? "0-1" as const : "1-0" as const, reason: "Checkmate" };
  if (chess.isStalemate()) return { result: "1/2-1/2" as const, reason: "Stalemate" };
  if (chess.isInsufficientMaterial()) return { result: "1/2-1/2" as const, reason: "Insufficient material" };
  if (chess.isThreefoldRepetition()) return { result: "1/2-1/2" as const, reason: "Threefold repetition" };
  if (chess.isDraw()) return { result: "1/2-1/2" as const, reason: "Draw" };
  if (game.moves.length >= 180) return { result: "1/2-1/2" as const, reason: "Tournament adjudication" };
  return null;
}

function LiveBotGameViewer({ game, onClose }: { game: LiveBotGame; onClose: () => void }) {
  const chess = chessFromUciMoves(game.moves);
  const history = chess.history({ verbose: true });
  const last = history[history.length - 1];
  return (
    <Card className="live-bot-viewer">
      <div className="live-bot-viewer__header">
        <div>
          <h3><Eye /> Live Bot Game</h3>
          <p>{game.whiteName} vs {game.blackName} · {formatTimeControl(game.timeControl)}</p>
        </div>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
      <div className="live-bot-viewer__content">
        <div>
          <ChessBoard
            chess={chess}
            orientation="white"
            size={420}
            lastMove={last ? { from: last.from, to: last.to } : null}
            disabled
          />
        </div>
        <div className="live-bot-viewer__side">
          <div className="live-clock live-clock--black"><strong>{game.blackName}</strong><span>{formatClock(game.clocks.b)}</span></div>
          <Badge tone="info">{chess.turn() === "w" ? "White thinking" : "Black thinking"}</Badge>
          <div className="live-clock live-clock--white"><strong>{game.whiteName}</strong><span>{formatClock(game.clocks.w)}</span></div>
          <div className="live-moves">
            {history.map((move, index) => <span key={`${move.san}-${index}`}>{Math.floor(index / 2) + 1}. {move.san}</span>)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function chessFromUciMoves(moves: string[]) {
  const chess = new Chess();
  for (const uci of moves) {
    const result = chess.move(parseUciMove(uci));
    if (!result) break;
  }
  return chess;
}

function parseUciMove(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] };
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function PairingMini({ tournament, pairing }: { tournament: Tournament; pairing: TournamentPairing }) {
  const white = tournament.participants.find((participant) => participant.id === pairing.whiteId);
  const black = tournament.participants.find((participant) => participant.id === pairing.blackId);
  return <div className="pairing-mini">R{pairing.round}: {white?.name ?? "Bye"} {black ? `vs ${black.name}` : ""} <Badge tone="muted">{pairing.result ?? pairing.status}</Badge></div>;
}

function BracketView({ tournament }: { tournament: Tournament }) {
  const rounds = Array.from(new Set(tournament.pairings.map((pairing) => pairing.round))).sort((a, b) => a - b);
  return (
    <div className="bracket-view">
      {rounds.map((round) => (
        <div key={round} className="bracket-round">
          <strong>Round {round}</strong>
          {tournament.pairings.filter((pairing) => pairing.round === round).map((pairing) => {
            const white = tournament.participants.find((participant) => participant.id === pairing.whiteId);
            const black = tournament.participants.find((participant) => participant.id === pairing.blackId);
            const winner = pairing.result === "1-0" || pairing.result === "bye" ? white?.id : pairing.result === "0-1" ? black?.id : null;
            return (
              <div key={pairing.id} className="bracket-match">
                <span className={winner === white?.id ? "winner" : ""}>{white?.name ?? "Bye"}</span>
                <span className={winner === black?.id ? "winner" : ""}>{black?.name ?? "Bye"}</span>
                <Badge tone={pairing.status === "needs-tiebreak" ? "danger" : pairing.status === "completed" || pairing.status === "bye" ? "success" : "muted"}>{pairing.result ?? pairing.status}</Badge>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function QuickStarts({ onCreated }: { onCreated: (tournament: Tournament) => void }) {
  return (
    <Card className="quick-starts">
      <h3>Quick Start</h3>
      <Button icon={<Trophy />} onClick={() => onCreated(createTournament({ name: "4-Player Blitz Cup", format: "round-robin", participants: [createHuman("ChessTrix Player"), ...fillBots(3)], timeControl: timeControlPresets[2] }))}>4-Player Blitz Cup</Button>
      <Button variant="secondary" icon={<Bot />} onClick={() => onCreated(createTournament({ name: "8-Bot Knockout", format: "knockout", participants: fillBots(8, "mixed"), timeControl: timeControlPresets[2] }))}>8-Bot Knockout</Button>
      <Button variant="secondary" icon={<Users />} onClick={() => onCreated(createTournament({ name: "Swiss Championship", format: "swiss", participants: [createHuman("ChessTrix Player"), ...fillBots(7)], timeControl: timeControlPresets[3], swissRounds: 4 }))}>Swiss Championship</Button>
    </Card>
  );
}

function labelFormat(format: TournamentFormat) {
  if (format === "round-robin") return "Round Robin";
  if (format === "knockout") return "Single Elimination";
  return "Swiss System";
}

function botProfileFor(participant: TournamentParticipant): BotProfile {
  const saved = getCustomBots().find((bot) => bot.id === participant.botId);
  if (saved) return saved;
  return {
    id: participant.botId ?? participant.id,
    name: participant.name,
    countryCode: "US",
    countryName: "United States",
    gender: "other",
    elo: participant.rating,
    skillLevel: Math.max(0, Math.min(20, Math.round((participant.rating - 800) / 100))),
    moveTimeMs: 500,
    blunderChance: participant.rating < 1200 ? 0.18 : participant.rating < 1800 ? 0.08 : 0.03,
    style: "Tournament",
    description: "Tournament bot"
  };
}
