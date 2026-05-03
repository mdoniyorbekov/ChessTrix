import { Archive, Bot, BrainCircuit, CircleDot, Crown, Gem, Puzzle, Shuffle, Trophy, Users } from "lucide-react";
import { Card } from "../common/Card";
import "./menu.css";

type ModeCardProps = {
  title: string;
  description: string;
  imageSrc: string;
  onClick: () => void;
};

export function ModeCard({ title, description, imageSrc, onClick }: ModeCardProps) {
  const Icon = iconForMode(title);
  return (
    <button className="mode-card" onClick={onClick}>
      <Card className="mode-card__inner card--interactive">
        <div className={`mode-card__media mode-card__media--${classNameFor(title)}`}>
          <Icon aria-hidden="true" />
          <img className="mode-card__image" src={imageSrc} alt="" />
        </div>
        <div className="mode-card__copy">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </Card>
    </button>
  );
}

function iconForMode(title: string) {
  const icons: Record<string, typeof Users> = {
    "Two Player": Users,
    "Play with Bots": Bot,
    "Puzzle Arena": Puzzle,
    Analysis: BrainCircuit,
    "Archive & Stats": Archive,
    Achievements: Gem,
    Tournaments: Trophy,
    Chess960: Shuffle,
    Crazyhouse: CircleDot,
    "4-Player Chess": Crown
  };
  return icons[title] ?? Users;
}

function classNameFor(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
