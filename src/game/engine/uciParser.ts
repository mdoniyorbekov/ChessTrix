export type UciMove = {
  from: string;
  to: string;
  promotion?: string;
};

export function parseUciMove(move: string): UciMove {
  return {
    from: move.slice(0, 2),
    to: move.slice(2, 4),
    promotion: move[4]
  };
}

export function toUciMove(from: string, to: string, promotion?: string) {
  return `${from}${to}${promotion ?? ""}`;
}
