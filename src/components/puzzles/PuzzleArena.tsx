import { useMemo, useState } from "react";
import { getPuzzles, getPuzzlesByRatingRange, getSolvedPuzzleIds } from "../../game/puzzles/puzzleManager";
import { PuzzleCard } from "./PuzzleCard";
import "./puzzles.css";

type PuzzleArenaProps = {
  onStart: (id: number) => void;
};

export function PuzzleArena({ onStart }: PuzzleArenaProps) {
  const [range, setRange] = useState("all");
  const puzzles = getPuzzles();
  const solved = getSolvedPuzzleIds();
  const grouped = getPuzzlesByRatingRange();
  const ranges = ["all", ...grouped.map((group) => group.range)];
  const filteredGroups = useMemo(() => (range === "all" ? grouped : grouped.filter((group) => group.range === range)), [range, grouped]);
  const solvedCount = puzzles.filter((puzzle) => solved.has(puzzle.id)).length;

  return (
    <div className="puzzle-arena">
      <div className="puzzle-arena__summary">
        <div>
          <h2>Puzzles</h2>
          <p>Top 100 popular puzzles per rating range, 800-900 through 2600-2700.</p>
        </div>
        <strong>{solvedCount} / {puzzles.length} solved</strong>
      </div>
      <div className="puzzle-filters">
        {ranges.map((item) => (
          <button key={item} className={item === range ? "active" : ""} onClick={() => setRange(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="puzzle-list">
        {filteredGroups.map((group) => (
          <section key={group.range} className="puzzle-range">
            <div className="puzzle-range__header">
              <h3>{group.range}</h3>
              <span>{group.puzzles.filter((puzzle) => solved.has(puzzle.id)).length} / {group.puzzles.length} solved</span>
            </div>
            <div className="puzzle-range__list">
              {group.puzzles.map((puzzle) => (
                <PuzzleCard key={puzzle.id} puzzle={puzzle} solved={solved.has(puzzle.id)} onStart={onStart} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
