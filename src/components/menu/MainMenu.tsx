import { useState } from "react";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import { getSavedTimeControl, saveTimeControl, timeControlPresets, formatTimeControl } from "../../game/timeControls";
import { publicAssetUrl } from "../../theme/assetPath";
import { ModeCard } from "./ModeCard";
import "./menu.css";

type MainMenuProps = {
  onSettings: () => void;
  onRoute: (mode: string) => void;
};

export function MainMenu({ onSettings, onRoute }: MainMenuProps) {
  const [timeControl, setTimeControl] = useState(getSavedTimeControl);
  const modes = [
    ["Two Player", "Classic local chess", "normal", "app-assets/menu-icons/Two Player.png"],
    ["Play with Bots", "Your custom AI opponents", "bots", "app-assets/menu-icons/Play with Bots.png"],
    ["Puzzle Arena", "Solve tactical puzzles", "puzzles", "app-assets/menu-icons/Puzzle Arena.png"],
    ["Analysis", "Study positions and games", "analysis", "app-assets/menu-icons/Analysis.png"],
    ["Archive & Stats", "Saved games and progress", "archive", "app-assets/menu-icons/Archive & Stats.png"],
    ["Achievements", "Badges and rewards", "achievements", "app-assets/menu-icons/Achievments.png"],
    ["Tournaments", "Cups, Swiss, brackets", "tournaments", "app-assets/menu-icons/Tournaments.png"],
    ["Chess960", "Randomized back rank", "chess960", "app-assets/menu-icons/Chess960.png"],
    ["Crazyhouse", "Captured pieces return", "crazyhouse", "app-assets/menu-icons/Crazyhouse.png"],
    ["4-Player Chess", "Local multiplayer chaos", "four-player", "app-assets/menu-icons/4-Player Chess.png"]
  ] as const;

  const chooseTime = (id: string) => {
    const next = timeControlPresets.find((preset) => preset.id === id) ?? timeControlPresets[3];
    setTimeControl(next);
    saveTimeControl(next);
  };

  return (
    <div className="main-menu main-menu--launcher">
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

      <footer className="main-menu__footer-logo">
        <img className="menu-logo" src={publicAssetUrl("app-assets/chesstrix-logo-horizontal.png?v=20260504-transparent")} alt="Chesstrix" />
      </footer>
    </div>
  );
}
