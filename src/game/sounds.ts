import { publicAssetUrl } from "../theme/assetPath";
import { getSavedSetting } from "./settings";

export type GameSound = "move" | "capture" | "notify";

const soundPaths: Record<GameSound, string> = {
  move: "chess-assets/sounds/default/move-self.mp3",
  capture: "chess-assets/sounds/default/capture.mp3",
  notify: "chess-assets/sounds/default/notify.mp3"
};

export function playGameSound(sound: GameSound) {
  if (!getSavedSetting("Sound", true)) return;

  const audio = new Audio(publicAssetUrl(soundPaths[sound]));
  audio.volume = sound === "notify" ? 0.5 : 0.62;
  void audio.play().catch(() => undefined);
}

export function playMoveSound(captured?: string | boolean) {
  playGameSound(captured ? "capture" : "move");
}
