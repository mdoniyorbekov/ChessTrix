export type UciMove = {
  from: string;
  to: string;
  promotion?: string;
};

export function isUciMove(move: string) {
  return /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(move);
}

export function parseUciMove(move: string): UciMove {
  const normalized = move.toLowerCase();
  return {
    from: normalized.slice(0, 2),
    to: normalized.slice(2, 4),
    promotion: normalized[4]
  };
}

export function toUciMove(from: string, to: string, promotion?: string) {
  return `${from}${to}${promotion ?? ""}`;
}
