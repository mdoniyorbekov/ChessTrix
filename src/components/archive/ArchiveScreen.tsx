import { Chess } from "chess.js";
import { Archive, BarChart3, ChevronFirst, ChevronLast, Copy, Eye, Search, Star, Trash2 } from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { calculateArchiveStats, deleteGame, getGames, inferHumanResult, toggleFavoriteGame, type SavedGame } from "../../game/platform/archive";
import { getTournaments, standingsFor } from "../../game/platform/tournaments";
import { formatTimeControl } from "../../game/timeControls";
import { useMoveReplayKeys } from "../../hooks/useMoveReplayKeys";
import { ChessBoard } from "../board/ChessBoard";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import "./archive.css";

type ArchiveScreenProps = {
  onReview: (game: SavedGame) => void;
};

export function ArchiveScreen({ onReview }: ArchiveScreenProps) {
  const [games, setGames] = useState(getGames);
  const [selectedId, setSelectedId] = useState<string | null>(games[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [ply, setPly] = useState(0);
  const [animationMove, setAnimationMove] = useState<{ from: string; to: string } | null>(null);
  const [copyState, setCopyState] = useState("Copy PGN");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const update = () => {
      setGames(getGames());
      setRevision((value) => value + 1);
    };
    window.addEventListener("chesstrix:archive", update);
    window.addEventListener("chesstrix:tournaments", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("chesstrix:archive", update);
      window.removeEventListener("chesstrix:tournaments", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const filtered = useMemo(() => sortGames(games.filter((game) => matches(game, filter, query)), sort), [games, filter, query, sort]);
  const selected = games.find((game) => game.id === selectedId) ?? filtered[0] ?? null;
  const stats = useMemo(() => calculateArchiveStats(games), [games]);
  const tournaments = useMemo(() => getTournaments(), [revision]);
  const tournamentWins = tournaments.filter((tournament) => tournament.status === "completed" && standingsFor(tournament)[0]?.participant.type === "human").length;
  const tournamentPodiums = tournaments.filter((tournament) => tournament.status === "completed" && standingsFor(tournament).slice(0, 3).some((standing) => standing.participant.type === "human")).length;
  const boardChess = useMemo(() => chessAtPly(selected, ply), [selected, ply]);

  const setReplayPly = (nextPly: number) => {
    if (selected) setAnimationMove(getArchiveReplayAnimationMove(selected, ply, nextPly));
    setPly(nextPly);
  };

  useMoveReplayKeys({ index: ply, maxIndex: selected?.moves.length ?? 0, onChange: setReplayPly, enabled: Boolean(selected) });

  useEffect(() => {
    setPly(0);
    setAnimationMove(null);
    setCopyState("Copy PGN");
  }, [selected?.id]);

  const remove = (game: SavedGame) => {
    if (!confirm(`Delete ${game.white} vs ${game.black} from the archive? Tournament records will stay stable.`)) return;
    deleteGame(game.id);
    setSelectedId(null);
  };

  const copyPgn = async (game: SavedGame) => {
    try {
      await navigator.clipboard?.writeText(game.pgn);
      setCopyState("Copied");
    } catch {
      setCopyState("Select PGN below");
    }
    window.setTimeout(() => setCopyState("Copy PGN"), 1600);
  };

  return (
    <div className="archive-screen">
      <section className="archive-list">
        <Card className="archive-toolbar">
          <div><Archive /><strong>Game Archive</strong></div>
          <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player, bot, opening..." /></label>
          <div className="archive-controls">
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">All games</option>
              <option value="wins">Wins</option>
              <option value="losses">Losses</option>
              <option value="draws">Draws</option>
              <option value="favorites">Favorites</option>
              <option value="bot">Bot games</option>
              <option value="human">Human games</option>
              <option value="tournament">Tournament</option>
              <option value="reviewed">Reviewed</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="short">Short/farmable</option>
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="longest">Longest game</option>
              <option value="shortest">Shortest game</option>
              <option value="bestAccuracy">Best accuracy</option>
              <option value="opening">Opening name</option>
            </select>
          </div>
        </Card>

        <div className="archive-items">
          {filtered.map((game) => (
            <button key={game.id} className={`archive-item ${selected?.id === game.id ? "active" : ""}`} onClick={() => setSelectedId(game.id)}>
              <div>
                <strong>{game.white} vs {game.black}</strong>
                <span>{new Date(game.createdAt).toLocaleString()} · {formatTimeControl(game.timeControl)}</span>
              </div>
              <div>
                <Badge tone={game.result === "1/2-1/2" ? "muted" : "accent"}>{game.result}</Badge>
                {game.favorite && <Star className="archive-star" />}
              </div>
              <small>{game.opening ?? "Opening not reviewed"} · {game.reviewed ? "Reviewed" : "Unreviewed"}</small>
            </button>
          ))}
          {!filtered.length && (
            <Card className="archive-empty">
              <strong>{games.length ? "No games match this filter yet." : "No saved games yet."}</strong>
              <span>Completed games are saved automatically, including tournament simulations.</span>
            </Card>
          )}
        </div>
      </section>

      <section className="archive-detail">
        <Card className="archive-stats">
          <h3><BarChart3 /> Statistics</h3>
          <div className="archive-stat-grid">
            <Metric label="Games" value={stats.total} />
            <Metric label="Wins" value={stats.wins} />
            <Metric label="Losses" value={stats.losses} />
            <Metric label="Draws" value={stats.draws} />
            <Metric label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} />
            <Metric label="Most Played Color" value={stats.mostPlayedColor} />
            <Metric label="White Score" value={`${stats.whiteWins}/${stats.whiteGames} (${stats.whiteWinRate.toFixed(0)}%)`} />
            <Metric label="Black Score" value={`${stats.blackWins}/${stats.blackGames} (${stats.blackWinRate.toFixed(0)}%)`} />
            <Metric label="Avg Accuracy" value={stats.averageAccuracy == null ? "N/A" : `${stats.averageAccuracy.toFixed(1)}%`} />
            <Metric label="Best Accuracy" value={stats.bestAccuracy == null ? "N/A" : `${stats.bestAccuracy.toFixed(1)}%`} />
            <Metric label="Avg Moves" value={stats.averageMoves.toFixed(1)} />
            <Metric label="Longest / Shortest" value={`${stats.longestGame} / ${stats.shortestGame}`} />
            <Metric label="Common Result" value={stats.commonReason} />
            <Metric label="Common Opening" value={stats.commonOpening} />
            <Metric label="Best Opening" value={stats.bestOpening} />
            <Metric label="Worst Opening" value={stats.worstOpening} />
            <Metric label="Most Played Bot" value={stats.mostPlayedBot} />
            <Metric label="Strongest Bot Beaten" value={stats.strongestBotBeaten} />
            <Metric label="Tournament W / Podiums" value={`${tournamentWins} / ${tournamentPodiums}`} />
          </div>
        </Card>

        {selected ? (
          <Card className="game-detail-card">
            <div className="game-detail-head">
              <div>
                <h3>{selected.white} vs {selected.black}</h3>
                <p>{selected.resultReason} · {selected.moveCount} half-moves · {selected.tournamentName ?? "Casual game"}</p>
                <div className="game-detail-tags">
                  {selected.tags.map((tag) => <Badge key={tag} tone="muted">{tag}</Badge>)}
                  {selected.reviewed && <Badge tone="success">Reviewed</Badge>}
                  {selected.xpAward ? <Badge tone="success">+{selected.xpAward.total} XP</Badge> : <Badge tone="muted">No XP reward</Badge>}
                </div>
              </div>
              <div className="game-detail-actions">
                <Button variant="ghost" icon={<Star />} onClick={() => toggleFavoriteGame(selected.id)}>{selected.favorite ? "Unfavorite" : "Favorite"}</Button>
                <Button variant="secondary" icon={<Eye />} onClick={() => onReview(selected)}>{selected.reviewed ? "Open Review" : "Run Review"}</Button>
                <Button variant="ghost" icon={<Copy />} onClick={() => copyPgn(selected)}>{copyState}</Button>
                <Button variant="danger" icon={<Trash2 />} onClick={() => remove(selected)}>Delete</Button>
              </div>
            </div>
            <div className="detail-metric-row">
              <Metric label="Human Result" value={inferHumanResult(selected)} />
              <Metric label="Opening" value={selected.opening ?? "Not reviewed"} />
              <Metric label="Accuracy" value={formatAccuracy(selected)} />
              <Metric label="Final FEN" value={<code>{selected.finalFen || "Unavailable"}</code>} />
            </div>
            <div className="archive-replay">
              <ChessBoard chess={boardChess} size={420} disabled lastMove={lastMoveAt(selected, ply)} animationMove={animationMove} />
              <div className="archive-moves">
                <div className="archive-replay-controls">
                  <Button variant="ghost" icon={<ChevronFirst />} disabled={ply <= 0} onClick={() => setReplayPly(0)}>First</Button>
                  <Button variant="ghost" disabled={ply <= 0} onClick={() => setReplayPly(Math.max(0, ply - 1))}>Back</Button>
                  <span>{ply} / {selected.moves.length}</span>
                  <Button variant="ghost" disabled={ply >= selected.moves.length} onClick={() => setReplayPly(Math.min(selected.moves.length, ply + 1))}>Next</Button>
                  <Button variant="ghost" icon={<ChevronLast />} disabled={ply >= selected.moves.length} onClick={() => setReplayPly(selected.moves.length)}>Last</Button>
                </div>
                <input className="archive-ply-slider" type="range" min={0} max={selected.moves.length} value={ply} onChange={(event) => setReplayPly(Number(event.target.value))} />
                <pre>{selected.pgn}</pre>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="game-detail-card"><h3>No saved games yet</h3><p>Finished games will appear here automatically.</p></Card>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return <div className="archive-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function matches(game: SavedGame, filter: string, query: string) {
  const haystack = `${game.white} ${game.black} ${game.bot?.name ?? ""} ${game.opening ?? ""} ${game.eco ?? ""} ${game.resultReason} ${game.tournamentName ?? ""} ${game.tags.join(" ")} ${game.createdAt}`.toLowerCase();
  const q = query.trim().toLowerCase();
  if (q && !haystack.includes(q)) return false;
  if (filter === "wins") return inferHumanResult(game) === "win";
  if (filter === "losses") return inferHumanResult(game) === "loss";
  if (filter === "draws") return game.result === "1/2-1/2";
  if (filter === "favorites") return game.favorite;
  if (filter === "bot") return game.whiteType === "bot" || game.blackType === "bot";
  if (filter === "human") return game.whiteType === "human" && game.blackType === "human";
  if (filter === "tournament") return Boolean(game.tournamentId);
  if (filter === "reviewed") return game.reviewed;
  if (filter === "unreviewed") return !game.reviewed;
  if (filter === "short") return game.moveCount < 16 || game.resultReason.toLowerCase().includes("manual");
  return true;
}

function sortGames(games: SavedGame[], sort: string) {
  return [...games].sort((a, b) => {
    if (sort === "oldest") return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    if (sort === "longest") return b.moveCount - a.moveCount;
    if (sort === "shortest") return a.moveCount - b.moveCount;
    if (sort === "bestAccuracy") return Math.max(b.accuracyWhite ?? 0, b.accuracyBlack ?? 0) - Math.max(a.accuracyWhite ?? 0, a.accuracyBlack ?? 0);
    if (sort === "opening") return (a.opening ?? "").localeCompare(b.opening ?? "");
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

function chessAtPly(game: SavedGame | null, ply: number) {
  const chess = new Chess(game?.initialFen);
  if (!game) return chess;
  for (const uci of game.moves.slice(0, ply)) {
    try {
      chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
    } catch {
      break;
    }
  }
  return chess;
}

function lastMoveAt(game: SavedGame, ply: number) {
  if (ply <= 0) return null;
  const uci = game.moves[ply - 1];
  return uci ? { from: uci.slice(0, 2), to: uci.slice(2, 4) } : null;
}

function getArchiveReplayAnimationMove(game: SavedGame, currentPly: number, nextPly: number) {
  if (nextPly < currentPly) {
    const undone = lastMoveAt(game, currentPly);
    return undone ? { from: undone.to, to: undone.from } : null;
  }
  if (nextPly > currentPly) return lastMoveAt(game, nextPly);
  return null;
}

function formatAccuracy(game: SavedGame) {
  const white = typeof game.accuracyWhite === "number" ? `W ${game.accuracyWhite.toFixed(1)}%` : null;
  const black = typeof game.accuracyBlack === "number" ? `B ${game.accuracyBlack.toFixed(1)}%` : null;
  return [white, black].filter(Boolean).join(" / ") || "Not reviewed";
}
