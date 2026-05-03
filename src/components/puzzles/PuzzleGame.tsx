import { Chess } from "chess.js";
import { useEffect, useMemo, useState } from "react";
import { getNextPuzzleId, getPuzzle, markPuzzleSolved } from "../../game/puzzles/puzzleManager";
import { toUciMove } from "../../game/engine/uciParser";
import { playGameSound, playMoveSound } from "../../game/sounds";
import { ChessBoard } from "../board/ChessBoard";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import "./puzzles.css";

type PuzzleGameProps = {
  puzzleId: number;
  onNext: (id: number) => void;
};

export function PuzzleGame({ puzzleId, onNext }: PuzzleGameProps) {
  const puzzle = getPuzzle(puzzleId);
  const [fen, setFen] = useState(puzzle.fen);
  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState("Find the best move");
  const [hintVisible, setHintVisible] = useState(false);
  const chess = useMemo(() => new Chess(fen), [fen]);
  const solved = step >= puzzle.solution.length;
  const hintMove = hintVisible && !solved ? parseUciMove(puzzle.solution[step]) : null;
  const motivation = motivationalLine(puzzle.id);

  useEffect(() => {
    setFen(puzzle.fen);
    setStep(0);
    setFeedback("Find the best move");
    setHintVisible(false);
  }, [puzzle.id, puzzle.fen]);

  const reset = () => {
    setFen(puzzle.fen);
    setStep(0);
    setFeedback("Find the best move");
    setHintVisible(false);
  };

  const handleMove = (from: string, to: string, promotion?: string) => {
    const expected = puzzle.solution[step];
    const played = toUciMove(from, to, promotion);
    if (played !== expected) {
      setFeedback("Try again");
      playGameSound("notify");
      return false;
    }

    const move = chess.move({ from, to, promotion });
    if (!move) return false;
    setHintVisible(false);
    playMoveSound(move.captured);

    const nextStep = step + 1;
    if (nextStep >= puzzle.solution.length) {
      setFen(chess.fen());
      setStep(nextStep);
      setFeedback("Congratulations");
      playGameSound("notify");
      markPuzzleSolved(puzzle.id);
      return true;
    }

    const reply = puzzle.solution[nextStep];
    const replyMove = chess.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] });
    playMoveSound(replyMove?.captured);
    setFen(chess.fen());
    setStep(nextStep + 1);
    setFeedback(nextStep + 1 >= puzzle.solution.length ? "Congratulations" : "Correct");
    if (nextStep + 1 >= puzzle.solution.length) {
      playGameSound("notify");
      markPuzzleSolved(puzzle.id);
    }
    return true;
  };

  return (
    <div className="puzzle-game">
      <Card className="puzzle-side">
        <h2>Puzzle #{puzzle.id}</h2>
        <p>{puzzle.ratingRange ?? puzzle.title}</p>
        <Badge>{puzzle.rating} rating</Badge>
        <Badge tone="info">{puzzle.theme}</Badge>
        {puzzle.popularity !== undefined && <Badge tone="success">Popularity {puzzle.popularity}</Badge>}
        <span>Progress {Math.min(step, puzzle.solution.length)} / {puzzle.solution.length}</span>
        <span>Streak placeholder</span>
      </Card>
      <ChessBoard chess={chess} size={640} onMove={handleMove} lastMove={null} hintMove={hintMove} />
      <Card className="puzzle-side">
        <h2>{feedback}</h2>
        {solved && (
          <div className="puzzle-congrats">
            <strong>{motivation}</strong>
            <div>
              <span>Brilliant</span>
              <span>Tactic found</span>
              <span>Keep going</span>
            </div>
          </div>
        )}
        <Button variant="secondary" onClick={reset}>Reset</Button>
        <Button onClick={() => onNext(getNextPuzzleId(puzzle.id))}>Next</Button>
        <Button variant="ghost" disabled={solved} onClick={() => setHintVisible((value) => !value)}>
          {hintVisible ? "Hide Hint" : "Hint"}
        </Button>
      </Card>
    </div>
  );
}

function parseUciMove(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4) };
}

function motivationalLine(id: number) {
  const lines = [
    "Nice calculation. Your pattern vision is getting sharper.",
    "Clean tactic. Keep stacking these wins.",
    "That was precise. One puzzle stronger.",
    "Great find. The board is starting to talk back.",
    "Excellent work. Stay patient and keep spotting ideas."
  ];
  return lines[id % lines.length];
}
