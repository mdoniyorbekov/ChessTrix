import { useEffect, useState } from "react";
import { deleteCustomBot, getCustomBots, BotProfile } from "../../game/bots/botProfiles";
import { BotCard } from "./BotCard";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";
import "./bots.css";

type BotSelectionProps = {
  onPlay: (bot: BotProfile) => void;
};

export function BotSelection({ onPlay }: BotSelectionProps) {
  const [bots, setBots] = useState<BotProfile[]>(getCustomBots);

  useEffect(() => {
    const update = () => setBots(getCustomBots());
    window.addEventListener("chesstrix:bots", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("chesstrix:bots", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const remove = (id: string) => {
    deleteCustomBot(id);
    setBots(getCustomBots());
  };

  if (!bots.length) {
    return (
      <Card className="bot-empty">
        <Badge tone="info">No bots yet</Badge>
        <h2>Create your bots in Settings</h2>
        <p>Add a name, gender, Elo, avatar, style, and engine difficulty, then return here to play.</p>
      </Card>
    );
  }

  return (
    <div className="bot-selection">
      {bots.map((bot) => (
        <BotCard key={bot.id} bot={bot} onPlay={onPlay} onDelete={remove} />
      ))}
    </div>
  );
}
