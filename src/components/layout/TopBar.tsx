import { ArrowLeft, Settings } from "lucide-react";
import { publicAssetUrl } from "../../theme/assetPath";
import { Button } from "../common/Button";
import "./layout.css";

type TopBarProps = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onSettings?: () => void;
};

export function TopBar({ title = "CHESSTRIX", subtitle = "Chess arena", onBack, onSettings }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar__left">
        {onBack && <Button variant="ghost" icon={<ArrowLeft />} aria-label="Back" onClick={onBack} />}
        <img className="topbar-logo" src={publicAssetUrl("app-assets/chesstrix-logo-horizontal.png?v=20260504-transparent")} alt="Chesstrix" />
      </div>
      <div className="topbar__center">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="topbar__right">
        {onSettings && <Button variant="secondary" icon={<Settings />} aria-label="Settings" onClick={onSettings} />}
      </div>
    </header>
  );
}
