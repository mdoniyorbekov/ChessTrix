import { Chess, type Move } from "chess.js";
import { Activity, FileText, RotateCcw, Search, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatEvaluation, type EngineAnalysis } from "../../game/engine/evaluation";
import { requestAnalysis } from "../../game/engine/stockfishClient";
import { getOpeningContinuations, findDeepestOpeningForLine, findOpeningForFen, openingDisplay } from "../../game/openings/openingBook";
import { moveToUci } from "../../game/normal/moveUtils";
import { useMoveReplayKeys } from "../../hooks/useMoveReplayKeys";
import { ChessBoard } from "../board/ChessBoard";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import { EvaluationBar } from "./EvaluationBar";
import "./analysis.css";

type AnalysisScreenProps = {
  onRunReview?: (moves: string[], initialFen?: string) => void;
};

type EngineSettings = {
  depth: number;
  multiPv: number;
  threads: number;
  hashMb: number;
  autoAnalyze: boolean;
  showArrows: boolean;
};

const defaultSettings: EngineSettings = { depth: 14, multiPv: 3, threads: 2, hashMb: 128, autoAnalyze: true, showArrows: true };

export function AnalysisScreen({ onRunReview }: AnalysisScreenProps) {
  const [initialFen, setInitialFen] = useState<string | undefined>();
  const [fen, setFen] = useState(new Chess().fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([new Chess().fen()]);
  const [viewIndex, setViewIndex] = useState(0);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [analysis, setAnalysis] = useState<EngineAnalysis | null>(null);
  const [analysisFen, setAnalysisFen] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState("idle");
  const [fenText, setFenText] = useState("");
  const [pgnText, setPgnText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [variations, setVariations] = useState<string[]>([]);
  const [settings, setSettings] = useState<EngineSettings>(() => loadAnalysisSettings());
  const analysisRequestId = useRef(0);
  const activeFen = positions[viewIndex] ?? fen;
  const boardChess = useMemo(() => new Chess(activeFen), [activeFen]);
  const exactOpening = useMemo(() => findOpeningForFen(activeFen), [activeFen]);
  const deepestOpening = useMemo(() => findDeepestOpeningForLine(moves.slice(0, viewIndex), initialFen), [initialFen, moves, viewIndex]);
  const opening = exactOpening ?? deepestOpening;
  const continuations = getOpeningContinuations(activeFen).slice(0, 8);
  const canReview = moves.length > 0;

  const analyzeCurrentPosition = useCallback(async () => {
    const targetFen = activeFen;
    const requestId = analysisRequestId.current + 1;
    analysisRequestId.current = requestId;
    setEngineStatus("analyzing");
    setError(null);
    await window.chesstrixEngine?.stop().catch(() => undefined);
    requestAnalysis({ fen: targetFen }, { ...settings, timeoutMs: 15000 })
      .then((response) => {
        if (requestId !== analysisRequestId.current) return;
        if (response.available && response.analysis) {
          setAnalysis(response.analysis);
          setAnalysisFen(targetFen);
          setEngineStatus("idle");
        } else {
          setEngineStatus("error");
          setError(response.message ?? "Stockfish analysis unavailable.");
        }
      })
      .catch((err: Error) => {
        if (requestId !== analysisRequestId.current) return;
        setEngineStatus("error");
        setError(err.message);
      });
  }, [activeFen, settings]);

  useEffect(() => {
    if (!settings.autoAnalyze) return;
    const timer = window.setTimeout(() => {
      analyzeCurrentPosition();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [analyzeCurrentPosition, settings.autoAnalyze]);

  const updateSettings = <K extends keyof EngineSettings>(key: K, value: EngineSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem("chesstrix.analysis.settings", JSON.stringify(next));
  };

  const move = (from: string, to: string, promotion?: string) => {
    const chess = new Chess(activeFen);
    const result = safeMove(chess, { from, to, promotion });
    if (!result) return false;
    setAnalysis(null);
    setAnalysisFen(null);
    const nextMoves = viewIndex < moves.length ? [...moves.slice(0, viewIndex), moveToUci(result)] : [...moves, moveToUci(result)];
    if (viewIndex < moves.length) setVariations((current) => [`Variation after move ${viewIndex}: ${result.san}`, ...current].slice(0, 8));
    const nextPositions = rebuildPositions(initialFen, nextMoves);
    setMoves(nextMoves);
    setPositions(nextPositions);
    setViewIndex(nextPositions.length - 1);
    setFen(nextPositions[nextPositions.length - 1]);
    return true;
  };

  const reset = () => {
    const chess = new Chess();
    setInitialFen(undefined);
    setFen(chess.fen());
    setMoves([]);
    setPositions([chess.fen()]);
    setViewIndex(0);
    setAnalysis(null);
    setAnalysisFen(null);
    setError(null);
    setVariations([]);
  };

  const loadFen = () => {
    try {
      const chess = new Chess(fenText.trim());
      setInitialFen(chess.fen());
      setFen(chess.fen());
      setMoves([]);
      setPositions([chess.fen()]);
      setViewIndex(0);
      setAnalysis(null);
      setAnalysisFen(null);
      setError(null);
    } catch (err) {
      setError(`Invalid FEN: ${(err as Error).message}`);
    }
  };

  const loadPgn = () => {
    try {
      const chess = new Chess();
      chess.loadPgn(pgnText);
      const history = chess.history({ verbose: true }) as Move[];
      const nextMoves = history.map(moveToUci);
      const nextPositions = rebuildPositions(undefined, nextMoves);
      setInitialFen(undefined);
      setMoves(nextMoves);
      setPositions(nextPositions);
      setViewIndex(nextPositions.length - 1);
      setFen(nextPositions[nextPositions.length - 1]);
      setAnalysis(null);
      setAnalysisFen(null);
      setError(null);
    } catch (err) {
      setError(`Invalid PGN: ${(err as Error).message}`);
    }
  };

  const displayedAnalysis = analysisFen === activeFen ? analysis : null;
  const bestMove = settings.showArrows && displayedAnalysis?.bestMove ? { from: displayedAnalysis.bestMove.slice(0, 2), to: displayedAnalysis.bestMove.slice(2, 4) } : null;
  useMoveReplayKeys({ index: viewIndex, maxIndex: positions.length - 1, onChange: setViewIndex });

  const runGameReview = async () => {
    if (!canReview) return;
    analysisRequestId.current += 1;
    setEngineStatus("idle");
    await window.chesstrixEngine?.stop().catch(() => undefined);
    onRunReview?.(moves, initialFen);
  };

  return (
    <div className="analysis-workbench">
      <section className="analysis-board-column">
        <ChessBoard chess={boardChess} size={600} orientation={orientation} onMove={move} bestMove={bestMove} />
        <div className="analysis-board-controls">
          <Button variant="secondary" onClick={() => setViewIndex(Math.max(0, viewIndex - 1))}>Back</Button>
          <span>{viewIndex} / {positions.length - 1}</span>
          <Button variant="secondary" onClick={() => setViewIndex(Math.min(positions.length - 1, viewIndex + 1))}>Forward</Button>
          <Button variant="secondary" icon={<RotateCcw />} onClick={() => setOrientation((value) => (value === "white" ? "black" : "white"))}>Flip</Button>
          <Button variant="ghost" onClick={reset}>Reset</Button>
        </div>
      </section>

      <section className="analysis-main-column">
        <Card className="engine-panel">
          <div className="review-card-title"><Activity /><h3>Engine Analysis</h3></div>
          <div className="engine-panel__score">
            <EvaluationBar evaluation={displayedAnalysis?.evaluation} height={160} />
            <div>
              <strong>{displayedAnalysis ? formatEvaluation(displayedAnalysis.evaluation) : "0.0"}</strong>
              <Badge tone={engineStatus === "error" ? "danger" : engineStatus === "analyzing" ? "info" : "success"}>{engineStatus}</Badge>
            </div>
          </div>
          <Button icon={<Search />} onClick={analyzeCurrentPosition}>Analyze</Button>
          {error && <p className="analysis-error">{error}</p>}
          <div className="top-lines">
            <strong>Lines</strong>
            {displayedAnalysis?.lines.map((line) => (
              <div key={line.multipv}>
                <span>{line.multipv}. {line.move ? uciToSan(activeFen, line.move) : "..."}</span>
                <b>{formatEvaluation(line.evaluation)}</b>
                <small>{pvToSan(activeFen, line.pv).join(" ")}</small>
              </div>
            ))}
          </div>
        </Card>

        <Card className="opening-panel">
          <h3>Opening Explorer</h3>
          <strong>{openingDisplay(opening)}</strong>
          <p>{exactOpening ? opening?.moves : opening ? `Out of book. Last known line: ${opening.moves}` : "No matching opening found for this line yet."}</p>
          <div>
            {continuations.map((item) => <Badge key={item.uci} tone="info">{item.san}</Badge>)}
          </div>
        </Card>

        <Card className="analysis-move-list">
          <h3>Moves</h3>
          <div>
            {moves.map((uci, index) => (
              <button key={`${uci}-${index}`} className={viewIndex === index + 1 ? "active" : ""} onClick={() => setViewIndex(index + 1)}>
                {Math.floor(index / 2) + 1}. {uciToSan(positions[index], uci)}
              </button>
            ))}
          </div>
          {variations.length > 0 && <div className="variation-list">{variations.map((item) => <small key={item}>{item}</small>)}</div>}
          <Button disabled={!canReview} onClick={runGameReview}>Run Game Review</Button>
        </Card>
      </section>

      <section className="analysis-side-column">
        <Card className="import-panel">
          <div className="review-card-title"><Upload /><h3>Import</h3></div>
          <label>FEN<textarea value={fenText} onChange={(event) => setFenText(event.target.value)} /></label>
          <Button variant="secondary" onClick={loadFen}>Load FEN</Button>
          <label>PGN<textarea value={pgnText} onChange={(event) => setPgnText(event.target.value)} /></label>
          <Button variant="secondary" icon={<FileText />} onClick={loadPgn}>Load PGN</Button>
        </Card>

        <Card className="analysis-settings">
          <h3>Engine Settings</h3>
          <label>Depth<input type="number" min="6" max="24" value={settings.depth} onChange={(event) => updateSettings("depth", Number(event.target.value))} /></label>
          <label>MultiPV<input type="number" min="1" max="5" value={settings.multiPv} onChange={(event) => updateSettings("multiPv", Number(event.target.value))} /></label>
          <label>Threads<input type="number" min="1" max="8" value={settings.threads} onChange={(event) => updateSettings("threads", Number(event.target.value))} /></label>
          <label>Hash MB<input type="number" min="16" max="1024" value={settings.hashMb} onChange={(event) => updateSettings("hashMb", Number(event.target.value))} /></label>
          <label className="analysis-toggle"><span>Auto analyze</span><input type="checkbox" checked={settings.autoAnalyze} onChange={() => updateSettings("autoAnalyze", !settings.autoAnalyze)} /></label>
          <label className="analysis-toggle"><span>Show arrows</span><input type="checkbox" checked={settings.showArrows} onChange={() => updateSettings("showArrows", !settings.showArrows)} /></label>
          <small>Stockfish path uses the existing app engine configuration. Syzygy path is optional and not configured.</small>
        </Card>
      </section>
    </div>
  );
}

function loadAnalysisSettings() {
  try {
    return { ...defaultSettings, ...(JSON.parse(localStorage.getItem("chesstrix.analysis.settings") ?? "{}") as Partial<EngineSettings>) };
  } catch {
    return defaultSettings;
  }
}

function rebuildPositions(initialFen: string | undefined, moves: string[]) {
  const chess = new Chess(initialFen);
  const positions = [chess.fen()];
  moves.forEach((uci) => {
    safeMove(chess, { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    positions.push(chess.fen());
  });
  return positions;
}

function uciToSan(fen: string, uci: string) {
  const chess = new Chess(fen);
  const move = safeMove(chess, { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  return move?.san ?? uci;
}

function pvToSan(fen: string, pv: string[]) {
  const chess = new Chess(fen);
  const san: string[] = [];
  for (const uci of pv.slice(0, 8)) {
    const move = safeMove(chess, { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    if (!move) break;
    san.push(move.san);
  }
  return san;
}

function safeMove(chess: Chess, move: { from: string; to: string; promotion?: string }) {
  try {
    return chess.move(move) as Move | null;
  } catch {
    return null;
  }
}
