export const defaultAppSettings: Record<string, boolean> = {
  Sound: true,
  "Show coordinates": true,
  "Highlight legal moves": true,
  "Show evaluation bar": true,
  "Allow premoves": true,
  "Board arrows": true,
  "Flip board": false
};

export function getSavedSettings() {
  const saved = localStorage.getItem("chesstrix.settings");
  if (!saved) return { ...defaultAppSettings };

  try {
    return { ...defaultAppSettings, ...(JSON.parse(saved) as Record<string, boolean>) };
  } catch {
    return { ...defaultAppSettings };
  }
}

export function saveSettings(settings: Record<string, boolean>) {
  localStorage.setItem("chesstrix.settings", JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent("chesstrix:settings", { detail: settings }));
}

export function getSavedSetting(key: string, fallback = false) {
  return getSavedSettings()[key] ?? fallback;
}
