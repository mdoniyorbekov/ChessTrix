import { CheckCircle, Play } from "lucide-react";
import type { Puzzle } from "../../game/puzzles/puzzleManager";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import "./puzzles.css";

type PuzzleCardProps = {
  puzzle: Puzzle;
  solved: boolean;
  onStart: (id: number) => void;
};

export function PuzzleCard({ puzzle, solved, onStart }: PuzzleCardProps) {
  return (
    <div className="puzzle-row">
      <div className="puzzle-row__main">
        <strong>Puzzle {puzzle.id}</strong>
        <span>{puzzle.themes ?? puzzle.theme}</span>
      </div>
      <div className="puzzle-row__meta">
        <Badge>{puzzle.rating} rating</Badge>
        <Badge tone="info">{puzzle.theme}</Badge>
        <Badge tone={solved ? "success" : "muted"}>
          {solved && <CheckCircle />}
          {solved ? "Solved" : "Unsolved"}
        </Badge>
      </div>
      <Button icon={<Play />} variant={solved ? "secondary" : "primary"} onClick={() => onStart(puzzle.id)}>
        {solved ? "Replay" : "Start"}
      </Button>
    </div>
  );
}
