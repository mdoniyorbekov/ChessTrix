import { PropsWithChildren } from "react";
import { TopBar } from "./TopBar";
import "./layout.css";

type AppShellProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onSettings?: () => void;
  className?: string;
}>;

export function AppShell({ title, subtitle, onBack, onSettings, className = "", children }: AppShellProps) {
  return (
    <div className={`app-shell ${className}`}>
      <TopBar title={title} subtitle={subtitle} onBack={onBack} onSettings={onSettings} />
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
