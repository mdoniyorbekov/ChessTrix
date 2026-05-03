import { Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { getSavedTimeControl, saveTimeControl, timeControlPresets, formatTimeControl } from "../../game/timeControls";
import { publicAssetUrl } from "../../theme/assetPath";
import { ModeCard } from "./ModeCard";
import "./menu.css";

type MainMenuProps = {
  onPlay: () => void;
  onSettings: () => void;
  onRoute: (mode: string) => void;
};

export function MainMenu({ onPlay, onSettings, onRoute }: MainMenuProps) {
  const [timeControl, setTimeControl] = useState(getSavedTimeControl);
  const modes = [
    ["Two Player", "Classic local chess", "normal", "app-assets/chesscom/two_player_game.png"],
    ["Play with Bots", "Your custom AI opponents", "bots", "app-assets/section-icons/bots.svg"],
    ["Puzzle Arena", "Solve tactical puzzles", "puzzles", "app-assets/chesscom/puzzle.png"],
    ["Analysis", "Study positions and games", "analysis", "app-assets/chesscom/analysis.png"],
    ["Archive & Stats", "Saved games and progress", "archive", "app-assets/section-icons/archive.svg"],
    ["Achievements", "Badges and rewards", "achievements", "app-assets/section-icons/achievements.svg"],
    ["Tournaments", "Cups, Swiss, brackets", "tournaments", "app-assets/section-icons/tournaments.svg"],
    ["Chess960", "Randomized back rank", "chess960", "app-assets/section-icons/chess960.svg"],
    ["Crazyhouse", "Captured pieces return", "crazyhouse", "app-assets/chesscom/crazy_house.png"],
    ["4-Player Chess", "Local multiplayer chaos", "four-player", "app-assets/section-icons/four-player.svg"]
  ] as const;

  const chooseTime = (id: string) => {
    const next = timeControlPresets.find((preset) => preset.id === id) ?? timeControlPresets[3];
    setTimeControl(next);
    saveTimeControl(next);
  };

  return (
    <div className="main-menu">
      <section className="menu-hero">
        <div>
          <img className="menu-logo" src={publicAssetUrl("app-assets/chesstrix-logo.png")} alt="Chesstrix" />
          <p>Chess arena</p>
        </div>
        <div className="menu-hero__actions">
          <Button onClick={onPlay}>Play</Button>
          <Button variant="secondary" icon={<Settings />} onClick={onSettings}>
            Settings
          </Button>
        </div>
      </section>

      <section className="menu-grid">
        {modes.map(([title, description, route, image]) => (
          <ModeCard key={title} title={title} description={description} imageSrc={publicAssetUrl(image)} onClick={() => onRoute(route)} />
        ))}
      </section>

      <Card className="time-control-card">
        <div>
          <strong>Time Control</strong>
          <Badge>{formatTimeControl(timeControl)}</Badge>
        </div>
        <div className="time-control-pills">
          {timeControlPresets.slice(0, 5).map((preset) => (
            <button key={preset.id} className={preset.id === timeControl.id ? "active" : ""} onClick={() => chooseTime(preset.id)}>
              {formatTimeControl(preset)}
            </button>
          ))}
          <button onClick={onSettings}>Custom</button>
        </div>
      </Card>
    </div>
  );
}
