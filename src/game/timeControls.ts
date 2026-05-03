export type TimeControl = {
  id: string;
  name: string;
  minutes: number;
  incrementSeconds: number;
};

export const timeControlStorageKey = "chesstrix.timeControl";

export const timeControlPresets: TimeControl[] = [
  { id: "bullet-1-0", name: "1+0 Bullet", minutes: 1, incrementSeconds: 0 },
  { id: "blitz-3-0", name: "3+0 Blitz", minutes: 3, incrementSeconds: 0 },
  { id: "blitz-5-0", name: "5+0 Blitz", minutes: 5, incrementSeconds: 0 },
  { id: "rapid-10-0", name: "10+0 Rapid", minutes: 10, incrementSeconds: 0 },
  { id: "rapid-15-10", name: "15+10 Rapid", minutes: 15, incrementSeconds: 10 },
  { id: "classical-30-0", name: "30+0 Classical", minutes: 30, incrementSeconds: 0 }
];

export const defaultTimeControl = timeControlPresets[3];

export function getSavedTimeControl(): TimeControl {
  const saved = localStorage.getItem(timeControlStorageKey);
  if (!saved) return defaultTimeControl;

  try {
    const parsed = JSON.parse(saved) as TimeControl;
    if (parsed.minutes > 0 && parsed.incrementSeconds >= 0) return parsed;
  } catch {
    return defaultTimeControl;
  }

  return defaultTimeControl;
}

export function saveTimeControl(control: TimeControl) {
  localStorage.setItem(timeControlStorageKey, JSON.stringify(control));
  window.dispatchEvent(new CustomEvent("chesstrix:time-control", { detail: control }));
}

export function formatTimeControl(control: TimeControl) {
  return `${control.minutes}+${control.incrementSeconds}`;
}

export function formatClock(ms: number) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
