import { useEffect, useState } from "react";
import { getPieceSet, getSavedPieceSet } from "../../game/pieceSets";
import { publicAssetUrl } from "../../theme/assetPath";
import "./board.css";

const unicodePieces: Record<string, string> = {
  wk: "\u2654",
  wq: "\u2655",
  wr: "\u2656",
  wb: "\u2657",
  wn: "\u2658",
  wp: "\u2659",
  bk: "\u265A",
  bq: "\u265B",
  br: "\u265C",
  bb: "\u265D",
  bn: "\u265E",
  bp: "\u265F"
};

type PieceProps = {
  color: "w" | "b";
  type: string;
  size?: number;
  pieceSetOverride?: string;
};

export function Piece({ color, type, size, pieceSetOverride }: PieceProps) {
  const [pieceSetId, setPieceSetId] = useState(getSavedPieceSet);
  const [missingAsset, setMissingAsset] = useState(false);
  const activePieceSet = getPieceSet(pieceSetOverride ?? pieceSetId);
  const key = `${color}${type}`;
  const src = publicAssetUrl(`chess-assets/pieces/${activePieceSet.folder}/${key}.png`);

  useEffect(() => {
    const update = () => setPieceSetId(getSavedPieceSet());
    window.addEventListener("chesstrix:piece-set", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("chesstrix:piece-set", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  useEffect(() => {
    setMissingAsset(false);
  }, [src]);

  return (
    <span className={`piece piece--${color} piece--set-${activePieceSet.id}`} style={size ? { fontSize: size } : undefined}>
      {!missingAsset && <img src={src} alt="" onError={() => setMissingAsset(true)} />}
      {missingAsset && <span>{unicodePieces[key]}</span>}
    </span>
  );
}
