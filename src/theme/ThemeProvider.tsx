import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { defaultTheme, findTheme, ThemeDefinition } from "./themes";
import { publicAssetUrl } from "./assetPath";

type ThemeContextValue = {
  theme: ThemeDefinition;
  setThemeId: (id: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const storageKey = "chesstrix.theme";

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeId, setThemeIdState] = useState(() => localStorage.getItem(storageKey) ?? defaultTheme.id);
  const theme = findTheme(themeId);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme.id;
    root.style.setProperty("--color-bg", theme.background);
    root.style.setProperty("--color-panel", theme.panel);
    root.style.setProperty("--color-card", theme.card);
    root.style.setProperty("--color-border", theme.border);
    root.style.setProperty("--color-accent", theme.accent);
    root.style.setProperty("--color-accent-hover", theme.accentHover);
    root.style.setProperty("--color-text", theme.text);
    root.style.setProperty("--color-muted", theme.muted);
    root.style.setProperty("--color-disabled", theme.disabled);
    root.style.setProperty("--board-light", theme.boardLight);
    root.style.setProperty("--board-dark", theme.boardDark);
    root.style.setProperty("--board-image", theme.boardImage ? `url("${publicAssetUrl(theme.boardImage)}")` : "none");
    root.style.setProperty("--square-light-bg", theme.boardImage ? "transparent" : "var(--board-light)");
    root.style.setProperty("--square-dark-bg", theme.boardImage ? "transparent" : "var(--board-dark)");
    root.style.setProperty("--square-selected", theme.selected);
    root.style.setProperty("--square-last", theme.lastMove);
    root.style.setProperty("--square-legal", theme.legal);
    root.style.setProperty("--square-check", theme.check);
    root.style.setProperty("--color-danger", theme.danger);
    root.style.setProperty("--color-info", theme.info);
    localStorage.setItem(storageKey, theme.id);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setThemeId: setThemeIdState
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return value;
}
