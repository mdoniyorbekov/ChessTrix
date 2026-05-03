import { Play } from "lucide-react";
import { getCountryByCode } from "../../data/countries";
import { BotProfile } from "../../game/bots/botProfiles";
import { publicAssetUrl } from "../../theme/assetPath";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import "./bots.css";

type BotCardProps = {
  bot: BotProfile;
  onPlay: (bot: BotProfile) => void;
  onDelete?: (id: string) => void;
};

export function BotCard({ bot, onPlay, onDelete }: BotCardProps) {
  const country = getCountryByCode(bot.countryCode);

  return (
    <Card className="bot-card card--interactive">
      <div className="bot-card__avatar">
        {bot.avatarDataUrl ? <img src={bot.avatarDataUrl} alt="" /> : bot.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
      </div>
      <h3>{bot.name}</h3>
      <div className="bot-card__meta">
        <Badge>{bot.elo} Elo</Badge>
        <Badge tone="muted">
          <span className="bot-country-badge">
            <img src={publicAssetUrl(country.flagPath)} alt="" />
            {country.name}
          </span>
        </Badge>
        <Badge tone="info">{bot.style}</Badge>
        <Badge tone="muted">{bot.gender}</Badge>
      </div>
      <p>{bot.description}</p>
      <Button icon={<Play />} onClick={() => onPlay(bot)}>
        Play
      </Button>
      {onDelete && <Button variant="ghost" onClick={() => onDelete(bot.id)}>Delete</Button>}
    </Card>
  );
}
