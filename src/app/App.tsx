import { Chess, Move } from "chess.js";
import { ChevronLeft, ChevronRight, Flag, RefreshCw, RotateCcw, Shuffle, Undo2 } from "lucide-react";
import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnalysisCard } from "../components/analysis/AnalysisCard";
import { AnalysisScreen } from "../components/analysis/AnalysisScreen";
import { ReviewScreen } from "../components/analysis/ReviewScreen";
import { AchievementsScreen } from "../components/achievements/AchievementsScreen";
import { ArchiveScreen } from "../components/archive/ArchiveScreen";
import { BotSelection } from "../components/bots/BotSelection";
import { ChessBoard } from "../components/board/ChessBoard";
import { Piece } from "../components/board/Piece";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { AppShell } from "../components/layout/AppShell";
import { SidePanel } from "../components/layout/SidePanel";
import { MainMenu } from "../components/menu/MainMenu";
import { ModeSelection } from "../components/menu/ModeSelection";
import { PuzzleArena } from "../components/puzzles/PuzzleArena";
import { PuzzleGame } from "../components/puzzles/PuzzleGame";
import { SettingsScreen } from "../components/settings/SettingsScreen";
import { TournamentScreen, useLiveBotGameRunner, type TournamentLaunch } from "../components/tournaments/TournamentScreen";
import { getCountryByCode } from "../data/countries";
import type { BotProfile } from "../game/bots/botProfiles";
import { getCustomBots } from "../game/bots/botProfiles";
import { getBotMove } from "../game/bots/botMoveService";
import { executeChess960Castling, getChess960CastlingMoves, isChess960CastlingMove, sanitizeChess960FenAfterMove } from "../game/chess960/chess960Castling";
import { chess960Limitations, createChess960Game } from "../game/chess960/chess960Controller";
import { describeChess960 } from "../game/chess960/chess960Generator";
import { CppChessController } from "../game/cpp/CppChessController";
import { createCrazyhouseState, crazyhouseMove, dropPiece, type CrazyhouseState, type Pocket } from "../game/crazyhouse/crazyhouseController";
import type { EngineEvaluation } from "../game/engine/evaluation";
import { requestEvaluation } from "../game/engine/stockfishClient";
import { toUciMove } from "../game/engine/uciParser";
import { capturedPieces, gameStatus, moveToUci } from "../game/normal/moveUtils";
import { getSavedSetting } from "../game/settings";
import { playGameSound, playMoveSound } from "../game/sounds";
import { getGames, resultCode, saveCompletedGame, type CompletedGameInput } from "../game/platform/archive";
import { recomputeAchievements } from "../game/platform/achievements";
import type { XpAward } from "../game/platform/profile";
import { recordPairingResult } from "../game/platform/tournaments";
import { createFourPlayerState, currentPlayer, isFourPlayerInCheck, isPlayableFourSquare, legalFourPlayerTargets, moveFourPlayerPiece, type FourPlayerState } from "../game/fourPlayer/fourPlayerController";
import { formatClock, formatTimeControl, getSavedTimeControl, type TimeControl } from "../game/timeControls";
import { useMoveReplayKeys } from "../hooks/useMoveReplayKeys";
import { publicAssetUrl } from "../theme/assetPath";
import { AppRoute, initialRoute } from "./routes";
import { Poster } from "./Poster";
import "./App.css";

export function App() {
  const [route, setRoute] = useState<AppRoute>(initialRoute);
  useLiveBotGameRunner();
  const goMenu = () => setRoute({ screen: "main-menu" });
  const goModes = () => setRoute({ screen: "mode-selection" });
  const goSettings = () => setRoute({ screen: "settings" });

  if (route.screen === "splash") {
    return <SplashScreen onEnter={goMenu} />;
  }

  if (route.screen === "poster") {
    return <Poster onBack={goMenu} />;
  }

  const shellTitle = route.screen.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <AppShell title={shellTitle} onBack={route.screen === "main-menu" ? undefined : goMenu} onSettings={goSettings}>
      {route.screen === "main-menu" && <MainMenu onPlay={goModes} onSettings={goSettings} onRoute={(mode) => navigateMode(mode, setRoute)} />}
      {route.screen === "mode-selection" && <ModeSelection onSelect={(mode) => navigateMode(mode, setRoute)} />}
      {route.screen === "settings" && <SettingsScreen />}
      {route.screen === "analysis" && <AnalysisScreen onRunReview={(reviewMoves, reviewInitialFen) => setRoute({ screen: "review", moves: reviewMoves, initialFen: reviewInitialFen })} />}
      {route.screen === "archive" && <ArchiveScreen onReview={(game) => setRoute({ screen: "review", moves: game.moves, initialFen: game.initialFen, whiteName: game.white, blackName: game.black, gameId: game.id })} />}
      {route.screen === "achievements" && <AchievementsScreen />}
      {route.screen === "tournaments" && <TournamentScreen onPlayPairing={(tournamentGame) => setRoute({ screen: "normal-game", bot: tournamentGame.bot, tournamentGame })} />}
      {route.screen === "bot-selection" && <BotSelection onPlay={(bot) => setRoute({ screen: "normal-game", bot })} />}
      {route.screen === "normal-game" && (
        <NormalGame
          bot={route.bot}
          tournamentGame={route.tournamentGame}
          onReview={(review) => {
            const saved = saveCompletedGame(buildCompletedGameInput(review, route.bot, route.tournamentGame));
            if (route.tournamentGame) {
              const tournamentResult = saved.result === "*" ? resultCode(review.winner ?? "Draw") : saved.result;
              if (tournamentResult !== "*") recordPairingResult(route.tournamentGame.tournamentId, route.tournamentGame.pairingId, tournamentResult, saved.id);
            }
            recomputeAchievements(getGames());
            const xpText = saved.xpAward ? formatXpAward(saved.xpAward) : undefined;
            setRoute({ screen: "result", winner: review.winner ?? "Game over", result: review.result ?? "Game over", ...review, gameId: saved.id, tournamentId: route.tournamentGame?.tournamentId, xpText });
          }}
        />
      )}
      {route.screen === "puzzle-arena" && <PuzzleArena onStart={(puzzleId) => setRoute({ screen: "puzzle-game", puzzleId })} />}
      {route.screen === "puzzle-game" && <PuzzleGame puzzleId={route.puzzleId} onNext={(id) => setRoute({ screen: "puzzle-game", puzzleId: id })} />}
      {route.screen === "chess960" && <Chess960Screen onResign={(review) => setRoute({ screen: "result", winner: "Resignation", result: "The Chess960 game was resigned.", ...review })} />}
      {route.screen === "crazyhouse" && <CrazyhouseScreen />}
      {route.screen === "four-player" && <FourPlayerScreenV2 />}
      {route.screen === "review" && <ReviewScreen moves={route.moves} initialFen={route.initialFen} whiteName={route.whiteName} blackName={route.blackName} gameId={route.gameId} />}
      {route.screen === "result" && (
        <ResultScreen
          winner={route.winner}
          result={route.result}
          xpText={route.xpText}
          onMenu={goMenu}
          onTournament={route.tournamentId ? () => setRoute({ screen: "tournaments" }) : undefined}
          onReview={() => setRoute({ screen: "review", moves: route.moves, initialFen: route.initialFen, whiteName: route.whiteName, blackName: route.blackName, gameId: route.gameId })}
        />
      )}
    </AppShell>
  );
}

function navigateMode(mode: string, setRoute: (route: AppRoute) => void) {
  const map: Record<string, AppRoute> = {
    normal: { screen: "normal-game" },
    bots: { screen: "bot-selection" },
    puzzles: { screen: "puzzle-arena" },
    analysis: { screen: "analysis" },
    archive: { screen: "archive" },
    achievements: { screen: "achievements" },
    tournaments: { screen: "tournaments" },
    chess960: { screen: "chess960" },
    crazyhouse: { screen: "crazyhouse" },
    "four-player": { screen: "four-player" }
  };
  setRoute(map[mode] ?? { screen: "mode-selection" });
}

function formatXpAward(award: XpAward) {
  const reasons = award.reasons.map((reason) => reason.label).slice(0, 3).join(", ");
  return `+${award.total} XP${award.leveledUp ? ` · Level ${award.newLevel}` : ""}${reasons ? ` · ${reasons}` : ""}`;
}

function buildCompletedGameInput(
  review: { winner?: string; result?: string; moves: string[]; initialFen?: string; whiteName?: string; blackName?: string },
  bot?: BotProfile,
  tournamentGame?: TournamentLaunch
): CompletedGameInput {
  return {
    winner: review.winner ?? "Draw",
    resultReason: review.result ?? "Game over",
    moves: review.moves,
    initialFen: review.initialFen,
    whiteName: tournamentGame?.whiteName ?? review.whiteName ?? "White Player",
    blackName: tournamentGame?.blackName ?? review.blackName ?? bot?.name ?? "Black Player",
    whiteType: tournamentGame?.whiteType ?? "human",
    blackType: tournamentGame?.blackType ?? (bot ? "bot" : "human"),
    bot,
    timeControl: tournamentGame?.timeControl ?? getSavedTimeControl(),
    tournamentId: tournamentGame?.tournamentId,
    tournamentName: tournamentGame?.tournamentName,
    pairingId: tournamentGame?.pairingId
  };
}

function SplashScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="splash">
      <img className="splash__brand-image" src={publicAssetUrl("app-assets/chesstrix-logo-horizontal.png?v=20260504-transparent")} alt="Chesstrix" />
      <p>Chess arena</p>
      <div className="splash__progress"><span /></div>
      <Button onClick={onEnter}>Enter</Button>
    </div>
  );
}

function NormalGame({
  bot,
  onReview,
  chess960Fen,
  tournamentGame
}: {
  bot?: BotProfile;
  onReview: (review: { winner?: string; result?: string; moves: string[]; initialFen?: string; whiteName?: string; blackName?: string }) => void;
  chess960Fen?: string;
  tournamentGame?: TournamentLaunch;
}) {
  const isChess960 = Boolean(chess960Fen);
  const cppGame = useRef<CppChessController | null>(null);
  if (!cppGame.current) cppGame.current = new CppChessController(isChess960 ? "chess960" : "standard", chess960Fen);
  const [chess, setChess] = useState(() => new Chess(chess960Fen));
  const [revision, setRevision] = useState(0);
  const humanColor = tournamentGame?.humanColor ?? "w";
  const botSide = bot ? (humanColor === "b" ? "w" : "b") : undefined;
  const [orientation, setOrientation] = useState<"white" | "black">(humanColor === "b" ? "black" : "white");
  const [uciMoves, setUciMoves] = useState<string[]>([]);
  const [chess960History, setChess960History] = useState<Move[]>([]);
  const [positionHistory, setPositionHistory] = useState<string[]>(() => [new Chess(chess960Fen).fen()]);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [animationMove, setAnimationMove] = useState<{ from: string; to: string } | null>(null);
  const [slowBotAnimation, setSlowBotAnimation] = useState(false);
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null);
  const [engineMessage, setEngineMessage] = useState<string | undefined>();
  const [botThinking, setBotThinking] = useState(false);
  const [timeControl, setTimeControl] = useState<TimeControl>(() => tournamentGame?.timeControl ?? getSavedTimeControl());
  const [clocks, setClocks] = useState(() => createInitialClocks(tournamentGame?.timeControl ?? getSavedTimeControl()));
  const [clockStarted, setClockStarted] = useState(false);
  const [showEvaluationBar, setShowEvaluationBar] = useState(() => getSavedSetting("Show evaluation bar", true));
  const [allowPremoves, setAllowPremoves] = useState(() => getSavedSetting("Allow premoves", true));
  const [allowBoardArrows, setAllowBoardArrows] = useState(() => getSavedSetting("Board arrows", true));
  const [pendingPremoves, setPendingPremovesState] = useState<{ from: string; to: string; promotion?: string }[]>([]);
  const botRequestInFlight = useRef(false);
  const pendingPremovesRef = useRef<{ from: string; to: string; promotion?: string }[]>([]);
  const gameOverHandled = useRef(false);
  const history = isChess960 ? chess960History : cppGame.current.history();
  const captures = cppGame.current.getCapturedPieces() ?? capturedPieces(history);
  const status = cppGame.current.getGameStatus() ?? gameStatus(chess);
  const isViewingHistory = viewIndex !== null;
  const currentViewIndex = viewIndex ?? positionHistory.length - 1;
  const boardChess = useMemo(
    () => new Chess(isViewingHistory ? positionHistory[currentViewIndex] : chess.fen()),
    [chess, currentViewIndex, isViewingHistory, positionHistory, revision]
  );
  const boardLastMove = isViewingHistory ? getHistoryMoveForView(history, currentViewIndex) : lastMove;
  const boardOrientation = orientation;
  const legalMovesOverride = isChess960 && !isViewingHistory
    ? [
        ...(chess.moves({ verbose: true }) as Move[]).filter((move) => !move.flags.includes("k") && !move.flags.includes("q")),
        ...getChess960CastlingMoves(chess, chess960Fen!)
      ]
    : undefined;

  useEffect(() => {
    if (!chess.isGameOver() || gameOverHandled.current) return;
    gameOverHandled.current = true;
    setPendingPremoves([]);
    playGameSound("notify");
    onReview(buildReviewPayload(chess, uciMoves, chess960Fen, bot, tournamentGame));
  }, [chess, chess960Fen, onReview, revision, tournamentGame, uciMoves]);

  useEffect(() => {
    const updateTimeControl = () => {
      if (tournamentGame) return;
      const next = getSavedTimeControl();
      setTimeControl(next);
      setClocks(createInitialClocks(next));
    };
    window.addEventListener("chesstrix:time-control", updateTimeControl);
    return () => window.removeEventListener("chesstrix:time-control", updateTimeControl);
  }, [tournamentGame]);

  useEffect(() => {
    const updateSettings = () => {
      setShowEvaluationBar(getSavedSetting("Show evaluation bar", true));
      setAllowPremoves(getSavedSetting("Allow premoves", true));
      setAllowBoardArrows(getSavedSetting("Board arrows", true));
    };
    window.addEventListener("chesstrix:settings", updateSettings);
    window.addEventListener("storage", updateSettings);
    return () => {
      window.removeEventListener("chesstrix:settings", updateSettings);
      window.removeEventListener("storage", updateSettings);
    };
  }, []);

  useEffect(() => {
    if (!allowPremoves && pendingPremovesRef.current.length) setPendingPremoves([]);
  }, [allowPremoves]);

  const setPendingPremoves = (moves: { from: string; to: string; promotion?: string }[]) => {
    pendingPremovesRef.current = moves;
    setPendingPremovesState(moves);
  };

  const addPendingPremove = (move: { from: string; to: string; promotion?: string }) => {
    setPendingPremoves([...pendingPremovesRef.current, move]);
  };

  useEffect(() => {
    if (!clockStarted || chess.isGameOver() || isViewingHistory) return;
    const timer = window.setInterval(() => {
      const side = chess.turn();
      setClocks((current) => ({
        ...current,
        [side]: Math.max(0, current[side] - 1000)
      }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [chess, clockStarted, isViewingHistory, revision]);

  useEffect(() => {
    if (botSide && chess.turn() === botSide) return;

    let cancelled = false;
    requestEvaluation({ fen: chess.fen(), moves: [], chess960: Boolean(chess960Fen) }, { moveTimeMs: 700, chess960: Boolean(chess960Fen) }).then((response) => {
      if (cancelled) return;
      if (response.available && response.evaluation) {
        setEvaluation(response.evaluation);
        setEngineMessage(undefined);
      } else {
        setEngineMessage(response.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [botSide, revision, chess, chess960Fen]);

  useEffect(() => {
    if (!bot || !botSide || chess.turn() !== botSide || chess.isGameOver() || botRequestInFlight.current) return;

    let cancelled = false;
    botRequestInFlight.current = true;
    setBotThinking(true);
    getBotMove(chess, bot, Boolean(chess960Fen))
      .then((move) => {
        if (cancelled || !move) return;
        const result = isChess960 ? applyChess960Move(chess, chess960Fen!, move.from, move.to, move.promotion) : cppGame.current!.move(move.from, move.to, move.promotion);
        if (result) {
          if (!isChess960) setChess(new Chess(result.after));
          playMoveSound(result.captured);
          applyMoveClock(result.color, timeControl.incrementSeconds);
          const nextUciMoves = [moveToUci(result)];
          const nextPositions = [result.after];
          const nextHistory = [result];
          let nextLastMove = { from: result.from, to: result.to };
          const queuedMoves = pendingPremovesRef.current;
          const nextTurn = isChess960 ? chess.turn() : cppGame.current!.turn();
          if (queuedMoves.length && nextTurn === "w") {
            const [queued, ...remaining] = queuedMoves;
            const premoveResult = isChess960 ? applyChess960Move(chess, chess960Fen!, queued.from, queued.to, queued.promotion) : cppGame.current!.move(queued.from, queued.to, queued.promotion);
            setPendingPremoves(premoveResult ? remaining : []);
            if (premoveResult) {
              if (!isChess960) setChess(new Chess(premoveResult.after));
              playMoveSound(premoveResult.captured);
              applyMoveClock(premoveResult.color, timeControl.incrementSeconds);
              nextUciMoves.push(moveToUci(premoveResult));
              nextPositions.push(premoveResult.after);
              nextHistory.push(premoveResult);
              nextLastMove = { from: premoveResult.from, to: premoveResult.to };
            }
          }
          setLastMove(nextLastMove);
          setAnimationMove(null);
          setSlowBotAnimation(nextHistory.length === 1 && nextHistory[0].color === botSide);
          setUciMoves((moves) => [...moves, ...nextUciMoves]);
          if (isChess960) setChess960History((moves) => [...moves, ...nextHistory]);
          setPositionHistory((positions) => [...positions, ...nextPositions]);
          setViewIndex(null);
          setRevision((value) => value + 1);
        }
      })
      .finally(() => {
        botRequestInFlight.current = false;
        if (!cancelled) setBotThinking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bot, botSide, revision, chess, chess960Fen, timeControl.incrementSeconds]);

  const move = (from: string, to: string, promotion?: string) => {
    if (isViewingHistory || (botSide && chess.turn() === botSide)) return false;
    const result = isChess960 ? applyChess960Move(chess, chess960Fen!, from, to, promotion) : cppGame.current!.move(from, to, promotion);
    if (!result) return false;
    if (!isChess960) setChess(new Chess(result.after));
    playMoveSound(result.captured);
    setPendingPremoves([]);
    if (!clockStarted && result.color === "w") setClockStarted(true);
    applyMoveClock(result.color, timeControl.incrementSeconds);
    setLastMove({ from: result.from, to: result.to });
    setAnimationMove(null);
    setSlowBotAnimation(false);
    setUciMoves((moves) => [...moves, moveToUci(result)]);
    if (isChess960) setChess960History((moves) => [...moves, result]);
    setPositionHistory((positions) => [...positions, result.after]);
    setViewIndex(null);
    setRevision((value) => value + 1);
    return true;
  };

  const restart = () => {
    const next = new Chess(chess960Fen);
    if (isChess960 && chess960Fen) cppGame.current = new CppChessController("chess960", chess960Fen);
    else cppGame.current?.reset();
    gameOverHandled.current = false;
    setChess(next);
    setUciMoves([]);
    setChess960History([]);
    setPositionHistory([next.fen()]);
    setViewIndex(null);
    setLastMove(null);
    setAnimationMove(null);
    setSlowBotAnimation(false);
    setPendingPremoves([]);
    setClocks(createInitialClocks(timeControl));
    setClockStarted(false);
    setRevision((value) => value + 1);
  };

  const undo = () => {
    if (isChess960) {
      const trimBy = bot ? 2 : 1;
      const nextPositions = positionHistory.slice(0, Math.max(1, positionHistory.length - trimBy));
      setChess(new Chess(nextPositions[nextPositions.length - 1]));
      setChess960History((moves) => moves.slice(0, -trimBy));
    } else {
      cppGame.current?.undo();
      if (bot) cppGame.current?.undo();
      setChess(new Chess(cppGame.current?.fen()));
    }
    setUciMoves((moves) => moves.slice(0, bot ? -2 : -1));
    setPositionHistory((positions) => positions.slice(0, Math.max(1, positions.length - (bot ? 2 : 1))));
    setViewIndex(null);
    setLastMove(null);
    setAnimationMove(null);
    setSlowBotAnimation(false);
    setPendingPremoves([]);
    setRevision((value) => value + 1);
  };

  const applyMoveClock = (side: "w" | "b", incrementSeconds: number) => {
    if (incrementSeconds <= 0) return;
    setClocks((current) => ({
      ...current,
      [side]: current[side] + incrementSeconds * 1000
    }));
  };

  const goToMoveView = (nextIndex: number) => {
    setSlowBotAnimation(false);
    setAnimationMove(getReplayAnimationMove(history, currentViewIndex, nextIndex));
    if (nextIndex >= positionHistory.length - 1) {
      setViewIndex(null);
      return;
    }
    setViewIndex(Math.max(0, Math.min(nextIndex, positionHistory.length - 1)));
  };

  useMoveReplayKeys({ index: currentViewIndex, maxIndex: positionHistory.length - 1, onChange: goToMoveView });

  return (
    <div className="game-layout">
      <SidePanel>
        <PlayerCard
          title={bot ? bot.name : "Opponent"}
          subtitle={bot ? `${bot.elo} Elo - ${getCountryByCode(bot.countryCode).name} - ${bot.style}` : "Local player"}
          color="b"
          avatarDataUrl={bot?.avatarDataUrl}
          countryCode={bot?.countryCode}
        />
        <PlayerCard title="Current Player" subtitle={chess.turn() === "w" ? "White to move" : "Black to move"} color={chess.turn()} />
        <Card className="clock-card">
          <div><strong>Black</strong><span>{formatClock(clocks.b)}</span></div>
          <div><strong>White</strong><span>{formatClock(clocks.w)}</span></div>
          <Badge tone="muted">{formatTimeControl(timeControl)}</Badge>
        </Card>
        <Card className="compact-card"><strong>Mode</strong><span>{bot ? "Human vs Bot" : "Human vs Human"}</span></Card>
        {botThinking && <Badge tone="info">Bot thinking</Badge>}
        {pendingPremoves.length > 0 && <Badge tone="danger">{pendingPremoves.length} premove{pendingPremoves.length === 1 ? "" : "s"} queued</Badge>}
        {isViewingHistory && <Badge tone="accent">Viewing move {currentViewIndex}</Badge>}
      </SidePanel>

      <section className="board-column">
        <ChessBoard
          chess={boardChess}
          orientation={boardOrientation}
          size={640}
          lastMove={boardLastMove}
          animationMove={animationMove}
          animationDurationMs={slowBotAnimation ? 1500 : undefined}
          premoves={pendingPremoves}
          premoveColor={botSide && chess.turn() === botSide ? humanColor : undefined}
          allowPremove={allowPremoves && Boolean(bot) && !isViewingHistory}
          allowArrows={allowBoardArrows}
          legalMovesOverride={legalMovesOverride}
          onPremove={(from, to, promotion) => addPendingPremove({ from, to, promotion })}
          onCancelPremoves={() => setPendingPremoves([])}
          onMove={move}
          disabled={isViewingHistory}
        />
        <div className="board-controls">
          <Button variant="secondary" icon={<Undo2 />} onClick={undo}>Undo</Button>
          <Button variant="secondary" icon={<RefreshCw />} onClick={restart}>Restart</Button>
          <Button variant="secondary" icon={<RotateCcw />} onClick={() => setOrientation((value) => (value === "white" ? "black" : "white"))}>Flip</Button>
          <Button
            variant="danger"
            icon={<Flag />}
            onClick={() => {
              playGameSound("notify");
              const winner = chess.turn() === "w" ? "Black wins" : "White wins";
              onReview({
                winner,
                result: `${chess.turn() === "w" ? "White" : "Black"} resigned.`,
                moves: uciMoves,
                initialFen: chess960Fen,
                whiteName: tournamentGame?.whiteName ?? "White Player",
                blackName: tournamentGame?.blackName ?? bot?.name ?? "Black Player"
              });
            }}
          >
            Resign
          </Button>
        </div>
        <div className="replay-controls">
          <Button variant="ghost" icon={<ChevronLeft />} disabled={currentViewIndex <= 0} onClick={() => goToMoveView(currentViewIndex - 1)}>
            Back
          </Button>
          <span>{currentViewIndex} / {positionHistory.length - 1}</span>
          <Button variant="ghost" icon={<ChevronRight />} disabled={currentViewIndex >= positionHistory.length - 1} onClick={() => goToMoveView(currentViewIndex + 1)}>
            Forward
          </Button>
        </div>
        {pendingPremoves.length > 0 && (
          <div className="premove-controls">
            <span>{pendingPremoves.map((move) => `${move.from}-${move.to}`).join("  ")}</span>
            <Button variant="secondary" onClick={() => setPendingPremoves([])}>Cancel premoves</Button>
          </div>
        )}
      </section>

      <SidePanel>
        {showEvaluationBar && <AnalysisCard evaluation={evaluation} engineMessage={engineMessage} />}
        <Card className="compact-card"><strong>Status</strong><span>{status}</span></Card>
        <Card className="move-history">
          <h3>Move History</h3>
          <div>{history.map((move, index) => <span key={`${move.san}-${index}`}>{Math.floor(index / 2) + 1}. {move.san}</span>)}</div>
        </Card>
        <Card className="captured">
          <h3>Captured</h3>
          <CapturedPieces pieces={captures.white} color="b" />
          <CapturedPieces pieces={captures.black} color="w" />
        </Card>
      </SidePanel>
    </div>
  );
}

function PlayerCard({
  title,
  subtitle,
  color,
  avatarDataUrl,
  countryCode
}: {
  title: string;
  subtitle: string;
  color: "w" | "b";
  avatarDataUrl?: string;
  countryCode?: string;
}) {
  const country = countryCode ? getCountryByCode(countryCode) : null;

  return (
    <Card className="player-card">
      <div className={`player-card__avatar player-card__avatar--${color}`}>
        {avatarDataUrl ? <img src={avatarDataUrl} alt="" /> : color === "w" ? "W" : "B"}
      </div>
      <div>
        <strong>{title}</strong>
        <span>
          {country && <img className="player-card__flag" src={publicAssetUrl(country.flagPath)} alt="" />}
          {subtitle}
        </span>
      </div>
    </Card>
  );
}

function applyChess960Move(chess: Chess, initialFen: string, from: string, to: string, promotion?: string) {
  const castling = isChess960CastlingMove(chess, initialFen, from, to);
  if (castling) return executeChess960Castling(chess, initialFen, castling);

  const result = chess.move({ from, to, promotion });
  if (!result) return null;

  const sanitized = sanitizeChess960FenAfterMove(result.after, initialFen, result);
  if (sanitized !== result.after) {
    chess.load(sanitized, { skipValidation: true });
    return { ...result, after: sanitized } as Move;
  }
  return result;
}

function CapturedPieces({ pieces, color }: { pieces: string[]; color: "w" | "b" }) {
  return <div className="captured__row">{pieces.map((piece, index) => <Piece key={`${piece}-${index}`} color={color} type={piece} size={24} />)}</div>;
}

function createInitialClocks(timeControl: TimeControl) {
  const baseMs = timeControl.minutes * 60 * 1000;
  return { w: baseMs, b: baseMs };
}

function getHistoryMoveForView(history: Move[], viewIndex: number) {
  if (viewIndex <= 0) return null;
  const move = history[viewIndex - 1];
  return move ? { from: move.from, to: move.to } : null;
}

function getReplayAnimationMove(history: Move[], currentIndex: number, nextIndex: number) {
  if (nextIndex < currentIndex) {
    const undone = history[currentIndex - 1];
    return undone ? { from: undone.to, to: undone.from } : null;
  }
  if (nextIndex > currentIndex) {
    const replayed = history[nextIndex - 1];
    return replayed ? { from: replayed.from, to: replayed.to } : null;
  }
  return null;
}

function getCrazyhouseReplayAnimationMove(history: CrazyhouseReplayPosition[], currentIndex: number, nextIndex: number) {
  if (nextIndex < currentIndex) {
    const undone = history[currentIndex]?.lastMove;
    return undone ? { from: undone.to, to: undone.from } : null;
  }
  if (nextIndex > currentIndex) return history[nextIndex]?.lastMove ?? null;
  return null;
}

function buildReviewPayload(chess: Chess, moves: string[], initialFen: string | undefined, bot?: BotProfile, tournamentGame?: TournamentLaunch) {
  const reason = getGameEndReason(chess);
  const winner = getGameWinner(chess);
  return {
    winner,
    result: reason,
    moves,
    initialFen,
    whiteName: tournamentGame?.whiteName ?? "White Player",
    blackName: tournamentGame?.blackName ?? bot?.name ?? "Black Player"
  };
}

function getGameWinner(chess: Chess) {
  if (chess.isCheckmate()) return chess.turn() === "w" ? "Black wins" : "White wins";
  return "Draw";
}

function getGameEndReason(chess: Chess) {
  if (chess.isCheckmate()) return "Checkmate";
  if (chess.isStalemate()) return "Stalemate";
  if (chess.isInsufficientMaterial()) return "Insufficient material";
  if (chess.isThreefoldRepetition()) return "Threefold repetition";
  if (chess.isDraw()) return "Draw";
  return "Game over";
}

function Chess960Screen({ onResign }: { onResign: (review: { winner?: string; result?: string; moves: string[]; initialFen?: string; whiteName?: string; blackName?: string }) => void }) {
  const [setup, setSetup] = useState(() => createChess960Game());
  const [started, setStarted] = useState(false);
  const [bot, setBot] = useState<BotProfile | undefined>();
  const [customBots, setCustomBots] = useState<BotProfile[]>(getCustomBots);

  useEffect(() => {
    const update = () => setCustomBots(getCustomBots());
    window.addEventListener("chesstrix:bots", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("chesstrix:bots", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  if (started) {
    return <NormalGame bot={bot} chess960Fen={setup.position.fen} onReview={onResign} />;
  }

  return (
    <div className="setup-screen">
      <Card className="setup-card">
        <h2>Chess960</h2>
        <p>Position #{setup.position.id}</p>
        <p>{describeChess960(setup.position)}</p>
        <Badge tone="info">{chess960Limitations}</Badge>
        <div className="chess960-ai-select">
          <strong>Opponent</strong>
          <div>
            <button className={!bot ? "active" : ""} onClick={() => setBot(undefined)}>Human</button>
            {customBots.map((profile) => (
              <button key={profile.id} className={bot?.id === profile.id ? "active" : ""} onClick={() => setBot(profile)}>
                <img src={publicAssetUrl(getCountryByCode(profile.countryCode).flagPath)} alt="" />
                {profile.name}
              </button>
            ))}
          </div>
          {!customBots.length && <p>Create bots in Settings to play Chess960 vs AI.</p>}
        </div>
        <div className="setup-actions">
          <Button icon={<Shuffle />} onClick={() => setSetup(createChess960Game())}>Randomize</Button>
          <Button variant="secondary" onClick={() => setStarted(true)}>{bot ? "Play vs AI" : "Play vs Human"}</Button>
        </div>
      </Card>
      <ChessBoard chess={setup.chess} size={640} disabled />
    </div>
  );
}

type CrazyhouseReplayPosition = {
  fen: string;
  label: string;
  lastMove: { from: string; to: string } | null;
};

function CrazyhouseScreen() {
  const [state, setState] = useState<CrazyhouseState>(() => createCrazyhouseState());
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [positionHistory, setPositionHistory] = useState<CrazyhouseReplayPosition[]>(() => [{ fen: new Chess().fen(), label: "Start", lastMove: null }]);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [animationMove, setAnimationMove] = useState<{ from: string; to: string } | null>(null);
  const [selectedDrop, setSelectedDrop] = useState<{ color: "w" | "b"; type: keyof Pocket } | null>(null);
  const [pocketDrag, setPocketDrag] = useState<{ color: "w" | "b"; type: keyof Pocket; x: number; y: number } | null>(null);
  const isViewingHistory = viewIndex !== null;
  const currentViewIndex = viewIndex ?? positionHistory.length - 1;
  const boardPosition = positionHistory[currentViewIndex] ?? positionHistory[positionHistory.length - 1];
  const boardChess = useMemo(() => new Chess(boardPosition.fen), [boardPosition.fen]);
  const boardLastMove = isViewingHistory ? boardPosition.lastMove : lastMove;

  const goToMoveView = (nextIndex: number) => {
    setSelectedDrop(null);
    setPocketDrag(null);
    setAnimationMove(getCrazyhouseReplayAnimationMove(positionHistory, currentViewIndex, nextIndex));
    if (nextIndex >= positionHistory.length - 1) {
      setViewIndex(null);
      return;
    }
    setViewIndex(Math.max(0, Math.min(nextIndex, positionHistory.length - 1)));
  };

  useMoveReplayKeys({ index: currentViewIndex, maxIndex: positionHistory.length - 1, onChange: goToMoveView });

  const move = (from: string, to: string, promotion?: string) => {
    if (isViewingHistory) return false;
    const result = crazyhouseMove(state, from, to, promotion);
    if (!result) return false;
    playMoveSound(result.captured);
    setLastMove({ from: result.from, to: result.to });
    setAnimationMove(null);
    setPositionHistory((positions) => [...positions, { fen: result.after, label: result.san, lastMove: { from: result.from, to: result.to } }]);
    setViewIndex(null);
    setState({ chess: state.chess, pockets: { w: { ...state.pockets.w }, b: { ...state.pockets.b } } });
    return true;
  };

  const handleDrop = (square: string) => {
    if (isViewingHistory) return false;
    if (!selectedDrop) return false;
    const result = dropPiece(state, selectedDrop.color, selectedDrop.type, square);
    if (!result) return false;
    playMoveSound(false);
    setAnimationMove(null);
    setPositionHistory((positions) => [...positions, { fen: state.chess.fen(), label: `${selectedDrop.type.toUpperCase()}@${square}`, lastMove: null }]);
    setViewIndex(null);
    setSelectedDrop(null);
    setState({ chess: state.chess, pockets: { w: { ...state.pockets.w }, b: { ...state.pockets.b } } });
    return true;
  };

  const startPocketDrag = (color: "w" | "b", type: keyof Pocket, event: PointerEvent<HTMLButtonElement>) => {
    if (isViewingHistory) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedDrop({ color, type });
    setPocketDrag({ color, type, x: event.clientX, y: event.clientY });
  };

  const movePocketDrag = (event: PointerEvent<HTMLButtonElement>) => {
    setPocketDrag((current) => current ? { ...current, x: event.clientX, y: event.clientY } : current);
  };

  const finishPocketDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = pocketDrag;
    if (!drag || isViewingHistory) return;
    const squareElement = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-square]");
    const square = squareElement?.getAttribute("data-square");
    if (square) {
      const result = dropPiece(state, drag.color, drag.type, square);
      if (result) {
        playMoveSound(false);
        setAnimationMove(null);
        setPositionHistory((positions) => [...positions, { fen: state.chess.fen(), label: `${drag.type.toUpperCase()}@${square}`, lastMove: null }]);
        setViewIndex(null);
        setSelectedDrop(null);
        setState({ chess: state.chess, pockets: { w: { ...state.pockets.w }, b: { ...state.pockets.b } } });
      }
    }
    setPocketDrag(null);
  };

  return (
    <div className="crazyhouse-layout">
      <SidePanel>
        <PlayerCard title="Black Pocket" subtitle="Drag a piece to the board" color="b" />
        <PocketStack pocket={state.pockets.b} color="b" selectedDrop={selectedDrop} onSelect={(type) => !isViewingHistory && setSelectedDrop({ color: "b", type })} onDragStart={startPocketDrag} onDragMove={movePocketDrag} onDragEnd={finishPocketDrag} />
      </SidePanel>
      <section className="crazyhouse-center">
        <ChessBoard chess={boardChess} size={600} lastMove={boardLastMove} animationMove={animationMove} onMove={move} dropPiece={isViewingHistory ? null : selectedDrop} onDrop={handleDrop} disabled={isViewingHistory} />
        <div className="replay-controls">
          <Button variant="ghost" icon={<ChevronLeft />} disabled={currentViewIndex <= 0} onClick={() => goToMoveView(currentViewIndex - 1)}>
            Back
          </Button>
          <span>{currentViewIndex} / {positionHistory.length - 1}</span>
          <Button variant="ghost" icon={<ChevronRight />} disabled={currentViewIndex >= positionHistory.length - 1} onClick={() => goToMoveView(currentViewIndex + 1)}>
            Forward
          </Button>
        </div>
      </section>
      <SidePanel>
        <PlayerCard title="White Pocket" subtitle={gameStatus(state.chess)} color="w" />
        <PocketStack pocket={state.pockets.w} color="w" selectedDrop={selectedDrop} onSelect={(type) => !isViewingHistory && setSelectedDrop({ color: "w", type })} onDragStart={startPocketDrag} onDragMove={movePocketDrag} onDragEnd={finishPocketDrag} />
        <Card className="move-history"><h3>History</h3><div>{positionHistory.slice(1).map((item, index) => <span key={`${item.label}-${index}`}>{Math.floor(index / 2) + 1}. {item.label}</span>)}</div></Card>
      </SidePanel>
      {pocketDrag && (
        <div className="pocket-drag-piece" style={{ left: pocketDrag.x, top: pocketDrag.y }}>
          <Piece color={pocketDrag.color} type={pocketDrag.type} />
        </div>
      )}
    </div>
  );
}

function PocketView({ pocket, color, onSelect }: { pocket: Pocket; color: "w" | "b"; onSelect?: (piece: keyof Pocket) => void }) {
  return (
    <div className="pocket">
      {(Object.keys(pocket) as (keyof Pocket)[]).map((piece) => (
        <button key={piece} disabled={pocket[piece] <= 0} onClick={() => onSelect?.(piece)}>
          <Piece color={color} type={piece} size={28} />×{pocket[piece]}
        </button>
      ))}
    </div>
  );
}

function PocketStack({
  pocket,
  color,
  selectedDrop,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd
}: {
  pocket: Pocket;
  color: "w" | "b";
  selectedDrop?: { color: "w" | "b"; type: keyof Pocket } | null;
  onSelect?: (piece: keyof Pocket) => void;
  onDragStart?: (color: "w" | "b", piece: keyof Pocket, event: PointerEvent<HTMLButtonElement>) => void;
  onDragMove?: (event: PointerEvent<HTMLButtonElement>) => void;
  onDragEnd?: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  const pieces = (Object.keys(pocket) as (keyof Pocket)[]).flatMap((piece) => Array.from({ length: pocket[piece] }, (_, index) => ({ piece, index })));
  return (
    <div className="pocket pocket--stack">
      {pieces.length ? pieces.map(({ piece, index }) => (
        <button
          key={`${piece}-${index}`}
          className={selectedDrop?.color === color && selectedDrop.type === piece ? "active" : ""}
          onClick={() => onSelect?.(piece)}
          onPointerDown={(event) => onDragStart?.(color, piece, event)}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <Piece color={color} type={piece} size={30} />
        </button>
      )) : <span className="pocket__empty">Empty</span>}
    </div>
  );
}

function FourPlayerScreen() {
  const [state, setState] = useState<FourPlayerState>(() => createFourPlayerState());
  const [selected, setSelected] = useState<string | null>(null);
  const active = currentPlayer(state);
  const grid = Array.from({ length: 14 * 14 }, (_, index) => {
    const file = String.fromCharCode(97 + (index % 14));
    const rank = Math.floor(index / 14) + 1;
    return `${file}${rank}`;
  });

  const clickSquare = (square: string) => {
    const piece = state.pieces.find((item) => item.square === square && item.active);
    if (!selected) {
      if (piece?.color === active && !piece.dead) setSelected(piece.id);
      return;
    }
    moveFourPlayerPiece(state, selected, square);
    setSelected(null);
    setState({ ...state, pieces: state.pieces.map((pieceItem) => ({ ...pieceItem })) });
  };

  return (
    <div className="four-player-layout">
      <Card className="four-player-panel top">Yellow · {state.winner ? `${state.winner} wins` : `${active} to move`}</Card>
      <Card className="four-player-panel left">Green player</Card>
      <div className="four-board">
        {grid.map((square, index) => {
          const piece = state.pieces.find((item) => item.square === square && item.active);
          return (
            <button key={square} className={(Math.floor(index / 14) + index) % 2 ? "dark" : "light"} onClick={() => clickSquare(square)}>
              {piece && <FourPlayerPieceIcon color={piece.color} type={piece.type} dead={piece.dead} />}
            </button>
          );
        })}
      </div>
      <Card className="four-player-panel right">Blue player</Card>
      <Card className="four-player-panel bottom">Red player</Card>
    </div>
  );
}

function FourPlayerScreenV2() {
  const [state, setState] = useState<FourPlayerState>(() => createFourPlayerState());
  const [selected, setSelected] = useState<string | null>(null);
  const active = currentPlayer(state);
  const activeInCheck = isFourPlayerInCheck(state, active);
  const legalTargets = selected ? new Set(legalFourPlayerTargets(state, selected)) : new Set<string>();
  const grid = Array.from({ length: 14 * 14 }, (_, index) => {
    const file = String.fromCharCode(97 + (index % 14));
    const rank = Math.floor(index / 14) + 1;
    return `${file}${rank}`;
  });

  const clickSquare = (square: string) => {
    if (!isPlayableFourSquare(square) || state.winner) return;
    const piece = state.pieces.find((item) => item.square === square && item.active);
    if (!selected) {
      if (piece?.color === active && !piece.dead) setSelected(piece.id);
      return;
    }
    if (piece?.id === selected) {
      setSelected(null);
      return;
    }
    if (piece?.color === active && !piece.dead) {
      setSelected(piece.id);
      return;
    }
    const target = state.pieces.find((item) => item.square === square && item.active);
    const moved = moveFourPlayerPiece(state, selected, square);
    if (!moved) return;
    playMoveSound(Boolean(target));
    if (state.winner) playGameSound("notify");
    setSelected(null);
    setState({ ...state, pieces: state.pieces.map((pieceItem) => ({ ...pieceItem })), log: [...state.log], eliminated: [...state.eliminated], scores: { ...state.scores } });
  };

  return (
    <div className="four-player-layout">
      <Card className="four-player-panel top">Yellow - {state.scores.yellow} pts</Card>
      <Card className="four-player-panel left">Green - {state.scores.green} pts</Card>
      <div className="four-board">
        {grid.map((square, index) => {
          const piece = state.pieces.find((item) => item.square === square && item.active);
          const playable = isPlayableFourSquare(square);
          return (
            <button
              key={square}
              className={[
                playable ? ((Math.floor(index / 14) + index) % 2 ? "dark" : "light") : "void",
                selected && piece?.id === selected ? "selected" : "",
                legalTargets.has(square) ? "legal" : ""
              ].join(" ")}
              onClick={() => clickSquare(square)}
            >
              {piece && <FourPlayerPieceIcon color={piece.color} type={piece.type} dead={piece.dead} />}
            </button>
          );
        })}
      </div>
      <Card className="four-player-panel right">Blue - {state.scores.blue} pts</Card>
      <Card className="four-player-panel bottom">Red - {state.scores.red} pts</Card>
      <Card className="four-player-status">
        <strong>{state.winner ? `${state.winner} wins` : `${active} to move${activeInCheck ? " - check" : ""}`}</strong>
        <span>Local FFA: king safety is enforced; checkmate eliminates a player and dead armies remain on the board.</span>
        <div>{state.log.slice(0, 5).map((item, index) => <small key={index}>{item}</small>)}</div>
      </Card>
    </div>
  );
}

function FourPlayerPieceIcon({ color, type, dead }: { color: string; type: string; dead?: boolean }) {
  return (
    <span className={`four-piece four-piece--${color} ${dead ? "four-piece--dead" : ""}`} aria-label={type}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        {type === "king" && (
          <>
            <path d="M30 7h4v8h7v4h-7v8h-4v-8h-7v-4h7z" />
            <path d="M24 30h16l5 21H19z" />
            <path d="M17 52h30v6H17z" />
          </>
        )}
        {type === "queen" && (
          <>
            <circle cx="16" cy="17" r="4" />
            <circle cx="32" cy="12" r="4" />
            <circle cx="48" cy="17" r="4" />
            <path d="M14 23l8 25h20l8-25-12 11-6-16-6 16z" />
            <path d="M20 50h24v8H20z" />
          </>
        )}
        {type === "rook" && (
          <>
            <path d="M17 12h7v6h6v-6h4v6h6v-6h7v16H17z" />
            <path d="M22 28h20v21H22z" />
            <path d="M18 50h28v8H18z" />
          </>
        )}
        {type === "bishop" && (
          <>
            <circle cx="32" cy="13" r="4" />
            <path d="M22 35c0-9 10-20 10-20s10 11 10 20c0 6-4 10-10 10s-10-4-10-10z" />
            <path className="four-piece__cutout" d="M35 22l-10 14" />
            <path d="M23 47h18v5H23z" />
            <path d="M18 53h28v5H18z" />
          </>
        )}
        {type === "knight" && (
          <>
            <path d="M19 53h29v5H19z" />
            <path d="M23 48h21c-1-8-5-13-13-17l8-9c5 3 8 8 10 15l2-20-13-6c-8 2-16 10-17 19l8 2-7 7z" />
          </>
        )}
        {type === "pawn" && (
          <>
            <circle cx="32" cy="18" r="8" />
            <path d="M25 30h14l4 18H21z" />
            <path d="M18 50h28v8H18z" />
          </>
        )}
      </svg>
    </span>
  );
}

function ResultScreen({
  winner,
  result,
  xpText,
  onMenu,
  onReview,
  onTournament
}: {
  winner: string;
  result: string;
  xpText?: string;
  onMenu: () => void;
  onReview: () => void;
  onTournament?: () => void;
}) {
  return (
    <Card className="result-screen">
      <h2>{winner}</h2>
      <p>{result}</p>
      {xpText && <Badge tone="success">{xpText}</Badge>}
      <div>
        <Button onClick={onMenu}>Back to menu</Button>
        {onTournament && <Button variant="secondary" onClick={onTournament}>Tournament</Button>}
        <Button variant="secondary" onClick={onReview}>Review</Button>
      </div>
    </Card>
  );
}
