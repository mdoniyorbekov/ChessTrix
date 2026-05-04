import { useEffect } from "react";

type MoveReplayKeyOptions = {
  index: number;
  maxIndex: number;
  onChange: (index: number) => void;
  enabled?: boolean;
};

export function useMoveReplayKeys({ index, maxIndex, onChange, enabled = true }: MoveReplayKeyOptions) {
  useEffect(() => {
    if (!enabled || maxIndex <= 0) return;

    const handleReplayKeys = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isTextInputTarget(event.target)) return;

      const isPreviousKey = event.key === "ArrowLeft" || event.code === "ArrowLeft" || event.key === "<" || (event.shiftKey && event.code === "Comma");
      const isNextKey = event.key === "ArrowRight" || event.code === "ArrowRight" || event.key === ">" || (event.shiftKey && event.code === "Period");
      if (!isPreviousKey && !isNextKey) return;

      event.preventDefault();
      const nextIndex = Math.max(0, Math.min(maxIndex, index + (isNextKey ? 1 : -1)));
      onChange(nextIndex);
    };

    window.addEventListener("keydown", handleReplayKeys, true);
    return () => window.removeEventListener("keydown", handleReplayKeys, true);
  }, [enabled, index, maxIndex, onChange]);
}

function isTextInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || Boolean(target.closest("[contenteditable='true']")) || tagName === "input" || tagName === "textarea" || tagName === "select";
}
