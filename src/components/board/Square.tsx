import { PointerEvent, PropsWithChildren } from "react";
import "./board.css";

type SquareProps = PropsWithChildren<{
  name: string;
  light: boolean;
  selected?: boolean;
  legal?: boolean;
  premove?: boolean;
  hint?: boolean;
  annotationColor?: "red" | "yellow" | "blue" | "green";
  lastMove?: boolean;
  check?: boolean;
  showCoordinates?: boolean;
  fileLabel?: string;
  rankLabel?: string;
  feedbackIcon?: { src: string; label: string };
  onClick: () => void;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
}>;

export function Square({ name, light, selected, legal, premove, hint, annotationColor, lastMove, check, showCoordinates, fileLabel, rankLabel, feedbackIcon, onClick, onPointerDown, children }: SquareProps) {
  return (
    <button
      data-square={name}
      className={[
        "square",
        light ? "square--light" : "square--dark",
        selected ? "square--selected" : "",
        legal ? "square--legal" : "",
        premove ? "square--premove" : "",
        hint ? "square--hint" : "",
        lastMove ? "square--last" : "",
        check ? "square--check" : ""
      ].join(" ")}
      onClick={onClick}
      onPointerDown={onPointerDown}
      aria-label={name}
    >
      {children}
      {annotationColor && <span className={`square__annotation square__annotation--${annotationColor}`} />}
      {feedbackIcon && <img className="square__feedback-icon" src={feedbackIcon.src} alt={feedbackIcon.label} title={feedbackIcon.label} draggable={false} />}
      {showCoordinates && rankLabel && <span className="square__coord square__coord--rank">{rankLabel}</span>}
      {showCoordinates && fileLabel && <span className="square__coord square__coord--file">{fileLabel}</span>}
    </button>
  );
}
