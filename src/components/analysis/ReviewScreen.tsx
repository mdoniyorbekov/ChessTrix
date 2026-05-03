import { Chess } from "chess.js";
import { Award, BarChart3, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Sparkles, Target, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeGameReview,
  analyzeRetryMove,
  formattedEval,
  parseBestMove,
  reviewClassifications,
  type ReviewClassification,
  type ReviewMove,
  type ReviewOptions,
  type ReviewProgress,
  type ReviewResult
} from "../../game/analysis/reviewEngine";
import { reviewIconPath } from "../../game/analysis/reviewAssets";
import { getGames, updateGameReview } from "../../game/platform/archive";
import { recomputeAchievements } from "../../game/platform/achievements";
import { publicAssetUrl } from "../../theme/assetPath";
import { ChessBoard } from "../board/ChessBoard";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import "./analysis.css";

type ReviewScreenProps = {
  moves?: string[];
  initialFen?: string;
  whiteName?: string;
  blackName?: string;
  gameId?: string;
};

const reviewDepths = {
  Fast: 10,
  Balanced: 14,
  Deep: 16
};

const defaultOptions: ReviewOptions = { depth: reviewDepths.Fast, multiPv: 3, threads: 2, hashMb: 128 };
const retryClasses = new Set<ReviewClassification>(["Inaccuracy", "Mistake", "Miss", "Blunder"]);

type ReviewState =
  | { status: "empty" }
  | { status: "loading"; progress: ReviewProgress }
  | { status: "ready"; review: ReviewResult; cached: boolean }
  | { status: "error"; message: string };

export function ReviewScreen({ moves = [], initialFen, whiteName = "White Player", blackName = "Black Player", gameId }: ReviewScreenProps) {
  const [options, setOptions] = useState<ReviewOptions>(defaultOptions);
  const [state, setState] = useState<ReviewState>(() => (moves.length ? { status: "loading", progress: { done: 0, total: moves.length, message: "Preparing review..." } } : { status: "empty" }));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [retrying, setRetrying] = useState<ReviewMove | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(() => localStorage.getItem("chesstrix.review.debug") === "true");
  const cancelRef = useRef(false);
  const reviewKey = useMemo(() => `${initialFen ?? "start"}:${moves.join(" ")}:${options.depth}:${options.multiPv}`, [initialFen, moves, options.depth, options.multiPv]);

  useEffect(() => {
    if (!gameId || state.status !== "ready") return;
    const white = state.review.players.find((player) => player.player === "White")?.accuracy ?? undefined;
    const black = state.review.players.find((player) => player.player === "Black")?.accuracy ?? undefined;
    updateGameReview(gameId, {
      accuracyWhite: white,
      accuracyBlack: black,
      opening: state.review.openingName,
      eco: state.review.opening?.eco
    });
    recomputeAchievements(getGames());
  }, [gameId, state]);

  useEffect(() => {
    if (!moves.length) {
      setState({ status: "empty" });
      return;
    }

    cancelRef.current = false;
    setRetrying(null);
    setRetryMessage(null);
    setState({ status: "loading", progress: { done: 0, total: moves.length, message: "Preparing review..." } });
    analyzeGameReview(
      moves,
      initialFen,
      options,
      (progress) => setState((current) => (current.status === "loading" ? { status: "loading", progress } : current)),
      () => cancelRef.current
    )
      .then((review) => {
        if (!cancelRef.current) {
          setSelectedIndex(0);
          setState({ status: "ready", review, cached: false });
        }
      })
      .catch((error: Error) => {
        if (!cancelRef.current) setState({ status: "error", message: error.message });
      });

    return () => {
      cancelRef.current = true;
    };
  }, [reviewKey, moves, initialFen, options]);

  if (state.status === "empty") {
    return (
      <Card className="review-summary">
        <h2>Game Review</h2>
        <p>No game moves were found for this review.</p>
      </Card>
    );
  }

  if (state.status === "loading") {
    const percent = Math.round((state.progress.done / Math.max(1, state.progress.total)) * 100);
    return (
      <Card className="review-progress">
        <div>
          <h2>Game Review</h2>
          <p>{state.progress.message}</p>
        </div>
        <div className="review-progress__accuracy">
          <div>
            <span>Accuracy</span>
            <strong>{state.progress.gameAccuracy == null ? "--" : state.progress.gameAccuracy.toFixed(1)}</strong>
            <small>{state.progress.done} analyzed moves</small>
          </div>
          {(state.progress.players ?? []).map((player) => (
            <div key={player.player}>
              <span>{player.player}</span>
              <strong>{player.accuracy == null ? "--" : player.accuracy.toFixed(1)}</strong>
              <small>{player.analyzedMoves} moves</small>
            </div>
          ))}
        </div>
        <div className="review-progress__bar"><span style={{ width: `${percent}%` }} /></div>
        <Badge>{percent}%</Badge>
        <Button variant="secondary" icon={<X />} onClick={() => {
          cancelRef.current = true;
          window.chesstrixEngine?.stop();
          setState({ status: "error", message: "Analysis canceled." });
        }}>Cancel</Button>
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card className="review-summary">
        <h2>Game Review</h2>
        <p>{state.message}</p>
        <Button icon={<RefreshCw />} onClick={() => setOptions((current) => ({ ...current }))}>Try Again</Button>
      </Card>
    );
  }

  const { review } = state;
  const selected = review.moveReviews[Math.max(0, Math.min(selectedIndex, review.moveReviews.length - 1))];
  const boardFen = retrying ? retrying.beforeFen : selected?.afterFen ?? initialFen;
  const boardChess = new Chess(boardFen);
  const bestMove = selected ? parseBestMove(selected.bestMove) : null;
  const lastMove = selected ? selected.played : null;
  const selectedIconPath = selected ? reviewIconPath(selected.classification) : undefined;
  const boardFeedbackIcons = selected && selectedIconPath && !retrying
    ? { [selected.played.to]: { src: publicAssetUrl(selectedIconPath), label: selected.classification } }
    : undefined;

  const jump = (index: number) => {
    setRetrying(null);
    setRetryMessage(null);
    setSelectedIndex(Math.max(0, Math.min(index, review.moveReviews.length - 1)));
  };

  const startRetry = () => {
    if (!selected) return;
    setRetrying(selected);
    setRetryMessage("Find a better move from the position before the mistake.");
  };

  const tryRetryMove = (from: string, to: string, promotion?: string) => {
    if (!retrying) return false;
    analyzeRetryMove(retrying.beforeFen, { from, to, promotion }, options).then((result) => {
      setRetryMessage(
        result.ok
          ? `${result.good ? "Good retry" : "Still not best"} - Engine preferred: ${result.bestMoveSan ?? result.bestMove ?? "unknown"} - CP loss ${Math.round(result.centipawnLoss ?? 0)}`
          : result.message
      );
    });
    return false;
  };

  return (
    <div className="review-screen review-screen--full">
      <section className="review-topline">
        <ResultSummary review={review} whiteName={whiteName} blackName={blackName} />
        <AccuracyPanel review={review} />
        <Card className="review-settings">
          <h3>Review Settings</h3>
          <div className="review-setting-row">
            {Object.entries(reviewDepths).map(([label, depth]) => (
              <button key={label} className={options.depth === depth ? "active" : ""} onClick={() => setOptions((current) => ({ ...current, depth }))}>{label}</button>
            ))}
          </div>
          <label>
            MultiPV
            <input type="number" min="1" max="5" value={options.multiPv} onChange={(event) => setOptions((current) => ({ ...current, multiPv: Number(event.target.value) }))} />
          </label>
          <label className="analysis-toggle">
            <span>Show analysis details</span>
            <input
              type="checkbox"
              checked={showAnalysisDetails}
              onChange={() => {
                const next = !showAnalysisDetails;
                setShowAnalysisDetails(next);
                localStorage.setItem("chesstrix.review.debug", String(next));
              }}
            />
          </label>
          <Button variant="secondary" icon={<RefreshCw />} onClick={() => {
            localStorage.removeItem(review.cacheKey);
            setOptions((current) => ({ ...current }));
          }}>Reanalyze</Button>
        </Card>
      </section>

      <section className="review-workspace">
        <div className="review-board-column">
          <ChessBoard
            chess={boardChess}
            orientation={orientation}
            size={560}
            lastMove={retrying ? null : lastMove}
            bestMove={retrying ? null : bestMove}
            feedbackIcons={boardFeedbackIcons}
            onMove={retrying ? tryRetryMove : undefined}
            disabled={!retrying}
          />
          <div className="review-nav">
            <Button variant="ghost" icon={<ChevronFirst />} onClick={() => jump(0)} disabled={selectedIndex <= 0}>First</Button>
            <Button variant="ghost" icon={<ChevronLeft />} onClick={() => jump(selectedIndex - 1)} disabled={selectedIndex <= 0}>Prev</Button>
            <span>{selectedIndex + 1} / {review.moveReviews.length}</span>
            <Button variant="ghost" icon={<ChevronRight />} onClick={() => jump(selectedIndex + 1)} disabled={selectedIndex >= review.moveReviews.length - 1}>Next</Button>
            <Button variant="ghost" icon={<ChevronLast />} onClick={() => jump(review.moveReviews.length - 1)} disabled={selectedIndex >= review.moveReviews.length - 1}>Last</Button>
            <Button variant="secondary" icon={<RotateCcw />} onClick={() => setOrientation((value) => (value === "white" ? "black" : "white"))}>Flip</Button>
          </div>
          {retrying && (
            <Card className="retry-panel">
              <strong>Retry {retrying.classification}</strong>
              <p>{retryMessage}</p>
              <Button variant="secondary" onClick={() => setRetrying(null)}>Return to Review</Button>
            </Card>
          )}
        </div>

        <div className="review-center-column">
          <EvaluationGraph review={review} selectedIndex={selectedIndex} onSelect={jump} />
          <MoveList review={review} selectedIndex={selectedIndex} onSelect={jump} />
        </div>

        <CoachPanel move={selected} onRetry={startRetry} showAnalysisDetails={showAnalysisDetails} />
      </section>
    </div>
  );
}

function ResultSummary({ review, whiteName, blackName }: { review: ReviewResult; whiteName: string; blackName: string }) {
  return (
    <Card className="result-summary-card">
      <div className="review-card-title"><Award /><h3>Result</h3></div>
      <strong>{review.result.winner === "Unknown" ? "Game Review" : `${review.result.winner} ${review.result.winner === "Draw" ? "" : "wins"}`}</strong>
      <span>{review.result.reason}</span>
      <div className="result-summary-card__grid">
        <small>White</small><b>{whiteName}</b>
        <small>Black</small><b>{blackName}</b>
        <small>Total moves</small><b>{review.result.totalMoves}</b>
        <small>Engine</small><b>{review.engine}</b>
        <small>Depth</small><b>{review.depth}</b>
        <small>Opening</small><b>{review.openingName}</b>
        <small>Date</small><b>{new Date(review.createdAt).toLocaleString()}</b>
      </div>
    </Card>
  );
}

function AccuracyPanel({ review }: { review: ReviewResult }) {
  const analyzed = review.moveReviews.filter((move) => typeof move.accuracy === "number" && !move.excludeFromAccuracyAverage);
  const gameAccuracy = review.gameAccuracy ?? (analyzed.length ? analyzed.reduce((sum, move) => sum + (move.accuracy ?? 0), 0) / analyzed.length : null);
  const biggestBlunder = [...review.moveReviews].sort((a, b) => b.centipawnLoss - a.centipawnLoss)[0];
  const bestMove = review.moveReviews.find((move) => ["Brilliant", "Great", "Best"].includes(move.classification));
  return (
    <Card className="accuracy-card">
      <div className="review-card-title"><BarChart3 /><h3>Accuracy</h3></div>
      <div className="accuracy-card__game">
        <span>Game</span>
        <strong>{gameAccuracy === null ? "--" : gameAccuracy.toFixed(1)}</strong>
        <small>{analyzed.length} total analyzed moves</small>
      </div>
      <div className="accuracy-card__players">
        {review.players.map((player) => (
          <div key={player.player}>
            <span>{player.player}</span>
            <strong>{player.accuracy === null ? "--" : player.accuracy.toFixed(1)}</strong>
            <small>{player.analyzedMoves} analyzed moves</small>
          </div>
        ))}
      </div>
      <div className="accuracy-card__highlights">
        <small>Best move: <b>{bestMove ? `${bestMove.moveNumber}. ${bestMove.san}` : "None"}</b></small>
        <small>Biggest blunder: <b>{biggestBlunder && biggestBlunder.centipawnLoss > 0 ? `${biggestBlunder.moveNumber}. ${biggestBlunder.san} (${Math.round(biggestBlunder.centipawnLoss)} cp)` : "None"}</b></small>
      </div>
      <div className="classification-grid">
        {review.players.map((player) => (
          <div key={player.player}>
            <h4>{player.player}</h4>
            {reviewClassifications.map((item) => (
              <Badge key={item} className={`class-badge class-badge--${classNameFor(item)}`}>
                <ClassificationIcon classification={item} /> {item} {player.counts[item]}
              </Badge>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

function MoveList({ review, selectedIndex, onSelect }: { review: ReviewResult; selectedIndex: number; onSelect: (index: number) => void }) {
  const rows = [];
  for (let index = 0; index < review.moveReviews.length; index += 2) {
    rows.push([review.moveReviews[index], review.moveReviews[index + 1]].filter(Boolean));
  }
  return (
    <Card className="review-move-list">
      <h3>Move List</h3>
      <div>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="review-move-row">
            <span>{rowIndex + 1}.</span>
            {row.map((move) => (
              <button key={move.index} className={move.index === selectedIndex ? "active" : ""} onClick={() => onSelect(move.index)}>
                <strong>{move.san}</strong>
                <Badge className={`class-badge class-badge--${classNameFor(move.classification)}`}>
                  <ClassificationIcon classification={move.classification} /> {move.classification}
                </Badge>
                <small>{typeof move.accuracy === "number" ? `${move.accuracy.toFixed(0)}%` : formattedEval(move.evaluationAfter)}</small>
              </button>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

function CoachPanel({ move, onRetry, showAnalysisDetails }: { move?: ReviewMove; onRetry: () => void; showAnalysisDetails: boolean }) {
  if (!move) return <Card className="coach-panel">Select a move.</Card>;
  return (
    <Card className="coach-panel">
      <div className="review-card-title"><Target /><h3>Coach</h3></div>
      <Badge className={`class-badge class-badge--${classNameFor(move.classification)}`}>
        <ClassificationIcon classification={move.classification} /> {move.classification}
      </Badge>
      <h2>{move.san}</h2>
      <p>{move.explanation}</p>
      <div className="coach-reasons">
        {move.reasons.slice(1, 4).map((reason) => <small key={reason}>{reason}</small>)}
      </div>
      <dl>
        <dt>Played</dt><dd>{move.san}</dd>
        <dt>Best move</dt><dd>{move.bestMoveSan ?? move.bestMove ?? "Unknown"}</dd>
        <dt>Best eval</dt><dd>{formattedEval(move.evaluationBefore)}</dd>
        <dt>Actual eval</dt><dd>{formattedEval(move.evaluationAfter)}</dd>
        <dt>Best win</dt><dd>{move.bestWinPercent.toFixed(1)}%</dd>
        <dt>Actual win</dt><dd>{move.actualWinPercent.toFixed(1)}%</dd>
        <dt>Win loss</dt><dd>{move.winPercentLoss.toFixed(1)}%</dd>
        <dt>Centipawn loss</dt><dd>{Math.round(move.centipawnLoss)} cp</dd>
        <dt>Move accuracy</dt><dd>{typeof move.accuracy === "number" ? `${move.accuracy.toFixed(1)}%` : move.classification}</dd>
      </dl>
      {showAnalysisDetails && (
        <div className="analysis-debug-panel">
          <strong>Analysis details</strong>
          <dl>
            <dt>FEN before</dt><dd>{move.beforeFen}</dd>
            <dt>Actual UCI</dt><dd>{move.actualMoveUci}</dd>
            <dt>Best UCI</dt><dd>{move.bestMoveUci ?? "Unknown"}</dd>
            <dt>Raw best</dt><dd>{move.debug.rawBestScore ?? "n/a"} ({move.debug.bestScorePov})</dd>
            <dt>Raw actual</dt><dd>{move.debug.rawActualScore ?? "n/a"} ({move.debug.actualScorePov})</dd>
            <dt>FEN turn</dt><dd>{move.debug.fenSideToMove}</dd>
            <dt>White POV</dt><dd>{Math.round(move.bestScoreWhite)} {"->"} {Math.round(move.actualScoreWhite)} cp</dd>
            <dt>Mover POV</dt><dd>{Math.round(move.bestScoreMover)} {"->"} {Math.round(move.actualScoreMover)} cp</dd>
            <dt>Legal moves</dt><dd>{move.debug.legalMoveCount}</dd>
            <dt>Material</dt><dd>{move.debug.materialBefore} {"->"} {move.debug.materialAfter}</dd>
            <dt>Sacrifice</dt><dd>{move.debug.sacrificeCandidate ? "yes" : "no"}</dd>
            <dt>Request IDs</dt><dd>{move.debug.requestIdBest} / {move.debug.requestIdActual}</dd>
          </dl>
        </div>
      )}
      <div className="top-lines">
        <strong>Top lines</strong>
        {move.topLines.map((line) => (
          <div key={line.multipv}>
            <span>{line.multipv}. {line.san ?? line.move}</span>
            <b>{formattedEval(line.evaluation)}</b>
            <small>{line.pvSan.join(" ")}</small>
            {showAnalysisDetails && <small>{Math.round(line.normalized.cpWhite)} cp White / {Math.round(line.normalized.cpMover)} cp mover</small>}
          </div>
        ))}
      </div>
      {retryClasses.has(move.classification) && <Button icon={<Sparkles />} onClick={onRetry}>Retry Mistake</Button>}
    </Card>
  );
}

function ClassificationIcon({ classification }: { classification: ReviewClassification }) {
  const path = reviewIconPath(classification);
  if (!path) return null;
  return <img className="review-class-icon" src={publicAssetUrl(path)} alt="" draggable={false} />;
}

function EvaluationGraph({ review, selectedIndex, onSelect }: { review: ReviewResult; selectedIndex: number; onSelect: (index: number) => void }) {
  const width = 760;
  const height = 190;
  const padding = 16;
  const points = review.evaluations.map((evaluation, index) => {
    const x = padding + (review.evaluations.length === 1 ? (width - padding * 2) / 2 : (index / (review.evaluations.length - 1)) * (width - padding * 2));
    const y = padding + evalToY(evaluation, height - padding * 2);
    return { x, y, evaluation, move: review.moveReviews[index] };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  return (
    <Card className="eval-graph eval-graph--interactive">
      <div className="eval-graph__header"><span>White advantage</span><span>Black advantage</span></div>
      <svg className="eval-line-graph" viewBox={`0 0 ${width} ${height}`}>
        <rect x={padding} y={padding} width={width - padding * 2} height={(height - padding * 2) / 2} className="eval-line-graph__white-zone" />
        <rect x={padding} y={padding + (height - padding * 2) / 2} width={width - padding * 2} height={(height - padding * 2) / 2} className="eval-line-graph__black-zone" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} className="eval-line-graph__center" />
        <path d={path} className="eval-line-graph__path" />
        {points.map((point, index) => (
          <g key={index} className="eval-line-graph__click-target" onClick={() => onSelect(index)}>
            <circle
              cx={point.x}
              cy={point.y}
              r={index === selectedIndex ? 7 : point.move && ["Mistake", "Miss", "Blunder"].includes(point.move.classification) ? 6 : 4}
              className={`eval-line-graph__point ${index === selectedIndex ? "active" : ""} ${point.move ? `class-badge--${classNameFor(point.move.classification)}` : ""}`}
            />
          </g>
        ))}
      </svg>
    </Card>
  );
}

function evalToY(evaluation: { type: "cp" | "mate"; value: number }, graphHeight: number) {
  if (evaluation.type === "mate") return evaluation.value > 0 ? 0 : graphHeight;
  const pawns = Math.max(-8, Math.min(8, evaluation.value / 100));
  return graphHeight / 2 - (pawns / 8) * (graphHeight / 2);
}

function classNameFor(value: ReviewClassification) {
  return value.toLowerCase().replace(/\s+/g, "-");
}
