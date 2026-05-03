import { Check } from "lucide-react";
import { Button } from "../common/Button";
import { Card } from "../common/Card";
import type { ThemeDefinition } from "../../theme/themes";
import { publicAssetUrl } from "../../theme/assetPath";
import "./settings.css";

type ThemeCardProps = {
  theme: ThemeDefinition;
  selected: boolean;
  onSelect: () => void;
};

export function ThemeCard({ theme, selected, onSelect }: ThemeCardProps) {
  return (
    <Card className={`theme-card ${selected ? "theme-card--selected" : ""}`}>
      <div
        className="theme-card__preview"
        style={theme.boardImage ? { backgroundImage: `url("${publicAssetUrl(theme.boardImage)}")` } : { background: theme.background }}
      >
        {!theme.boardImage &&
          Array.from({ length: 16 }).map((_, index) => (
            <span
              key={index}
              style={{ background: (Math.floor(index / 4) + index) % 2 === 0 ? theme.boardLight : theme.boardDark }}
            />
          ))}
      </div>
      <div>
        <h3>{theme.name}</h3>
        <p style={{ color: theme.muted }}>Board texture</p>
      </div>
      <Button variant={selected ? "primary" : "secondary"} icon={selected ? <Check /> : undefined} onClick={onSelect}>
        {selected ? "Selected" : "Select"}
      </Button>
    </Card>
  );
}
