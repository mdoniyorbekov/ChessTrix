import { Piece } from "./Piece";
import "./board.css";

type PromotionModalProps = {
  color: "w" | "b";
  onSelect: (piece: "q" | "r" | "b" | "n") => void;
};

export function PromotionModal({ color, onSelect }: PromotionModalProps) {
  const options = ["q", "r", "b", "n"] as const;
  return (
    <div className="promotion-backdrop">
      <div className="promotion-modal">
        {options.map((piece) => (
          <button key={piece} onClick={() => onSelect(piece)} aria-label={`Promote to ${piece}`}>
            <Piece color={color} type={piece} />
          </button>
        ))}
      </div>
    </div>
  );
}
