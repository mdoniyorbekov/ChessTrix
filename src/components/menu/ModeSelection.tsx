import { publicAssetUrl } from "../../theme/assetPath";
import { ModeCard } from "./ModeCard";
import "./menu.css";

type ModeSelectionProps = {
  onSelect: (mode: string) => void;
};

export function ModeSelection({ onSelect }: ModeSelectionProps) {
  const modes = [
    ["Two Player", "Classic local chess", "normal", "app-assets/chesscom/two_player_game.png"],
    ["Play with Bots", "Play against your custom AI bots", "bots", "app-assets/section-icons/bots.svg"],
    ["Puzzle Arena", "Solve tactical puzzles", "puzzles", "app-assets/chesscom/puzzle.png"],
    ["Analysis", "Free board and engine study", "analysis", "app-assets/chesscom/analysis.png"],
    ["Archive & Stats", "Saved games and progress", "archive", "app-assets/section-icons/archive.svg"],
    ["Achievements", "Badges and rewards", "achievements", "app-assets/section-icons/achievements.svg"],
    ["Tournaments", "Cups, Swiss, brackets", "tournaments", "app-assets/section-icons/tournaments.svg"],
    ["Chess960", "Randomized back-rank chess", "chess960", "app-assets/section-icons/chess960.svg"],
    ["Crazyhouse", "Captured pieces return", "crazyhouse", "app-assets/chesscom/crazy_house.png"],
    ["4-Player Chess", "Local multiplayer chaos", "four-player", "app-assets/section-icons/four-player.svg"]
  ] as const;

  return (
    <div className="mode-selection">
      {modes.map(([title, description, route, image]) => (
        <ModeCard key={title} title={title} description={description} imageSrc={publicAssetUrl(image)} onClick={() => onSelect(route)} />
      ))}
    </div>
  );
}
