import { Chess, type Color, type Move, type PieceSymbol, type Square } from "chess.js";

export type Chess960CastleSide = "king" | "queen";

export type Chess960CastlingInfo = {
  color: Color;
  side: Chess960CastleSide;
  kingStart: Square;
  rookStart: Square;
  kingFinal: Square;
  rookFinal: Square;
  uiTarget: Square;
  san: "O-O" | "O-O-O";
};

type BoardPiece = { color: Color; type: PieceSymbol };

const files = "abcdefgh";

export function getChess960CastlingMoves(chess: Chess, initialFen: string): Move[] {
  const color = chess.turn();
  const king = findKing(chess, color);
  if (!king) return [];
  return (["king", "queen"] as const)
    .map((side) => getCastlingInfo(chess, initialFen, color, side))
    .filter((info): info is Chess960CastlingInfo => Boolean(info && canCastle(chess, initialFen, info)))
    .map((info) => makeCastlingMove(chess, info, king));
}

export function isChess960CastlingMove(chess: Chess, initialFen: string, from: string, to: string) {
  if (from !== findKing(chess, chess.turn())) return null;
  return (["king", "queen"] as const)
    .map((side) => getCastlingInfo(chess, initialFen, chess.turn(), side))
    .find((info): info is Chess960CastlingInfo => Boolean(info && canCastle(chess, initialFen, info) && (to === info.uiTarget || to === info.kingFinal || to === info.rookStart))) ?? null;
}

export function executeChess960Castling(chess: Chess, initialFen: string, info: Chess960CastlingInfo) {
  const before = chess.fen();
  const board = boardFromFen(before);
  const king = board.get(info.kingStart);
  const rook = board.get(info.rookStart);
  if (!king || !rook) return null;

  // Clear both original squares first. In Chess960 the king or rook may already
  // sit on one of the final castling squares, so assignment order matters.
  board.delete(info.kingStart);
  board.delete(info.rookStart);
  board.set(info.kingFinal, king);
  board.set(info.rookFinal, rook);

  const afterFen = buildFenWithBoard(before, board, {
    turn: info.color === "w" ? "b" : "w",
    castling: removeCastlingRights(before, info.color),
    enPassant: "-",
    halfmove: Number(before.split(/\s+/)[4] ?? 0) + 1,
    fullmove: Number(before.split(/\s+/)[5] ?? 1) + (info.color === "b" ? 1 : 0)
  });

  chess.load(afterFen, { skipValidation: true });
  return {
    color: info.color,
    from: info.kingStart,
    to: info.kingFinal,
    piece: "k",
    captured: undefined,
    promotion: undefined,
    flags: info.side === "king" ? "k" : "q",
    san: info.san,
    lan: `${info.kingStart}${info.kingFinal}`,
    before,
    after: afterFen
  } as Move;
}

export function sanitizeChess960FenAfterMove(fen: string, initialFen: string, move?: Pick<Move, "color" | "from" | "to" | "piece" | "captured">) {
  const parts = fen.split(/\s+/);
  const rights = parts[2] ?? "-";
  if (rights === "-") return fen;
  const board = boardFromFen(fen);
  let nextRights = rights;

  for (const color of ["w", "b"] as const) {
    const kingStart = originalKingSquare(initialFen, color);
    const king = kingStart ? board.get(kingStart) : undefined;
    if (!kingStart || king?.type !== "k" || king.color !== color || move?.from === kingStart) {
      nextRights = removeColorRights(nextRights, color);
      continue;
    }

    for (const side of ["king", "queen"] as const) {
      const rookStart = originalRookSquare(initialFen, color, side);
      const flag = rightFlag(color, side);
      const rook = rookStart ? board.get(rookStart) : undefined;
      if (!rookStart || rook?.type !== "r" || rook.color !== color || move?.from === rookStart || move?.to === rookStart) {
        nextRights = nextRights.replace(flag, "");
      }
    }
  }

  parts[2] = nextRights || "-";
  return parts.join(" ");
}

export function getCastlingInfo(chess: Chess, initialFen: string, color: Color, side: Chess960CastleSide): Chess960CastlingInfo | null {
  const kingStart = originalKingSquare(initialFen, color);
  const rookStart = originalRookSquare(initialFen, color, side);
  if (!kingStart || !rookStart) return null;
  const rank = color === "w" ? "1" : "8";
  const kingFinal = `${side === "king" ? "g" : "c"}${rank}` as Square;
  const rookFinal = `${side === "king" ? "f" : "d"}${rank}` as Square;
  const currentKing = findKing(chess, color);
  const currentRook = chess.get(rookStart);
  if (currentKing !== kingStart || currentRook?.type !== "r" || currentRook.color !== color) return null;
  return {
    color,
    side,
    kingStart,
    rookStart,
    kingFinal,
    rookFinal,
    uiTarget: kingStart === kingFinal ? rookStart : kingFinal,
    san: side === "king" ? "O-O" : "O-O-O"
  };
}

function canCastle(chess: Chess, initialFen: string, info: Chess960CastlingInfo) {
  if (!hasRight(chess.fen(), info.color, info.side)) return false;
  const board = boardFromFen(chess.fen());
  const king = board.get(info.kingStart);
  const rook = board.get(info.rookStart);
  if (king?.type !== "k" || king.color !== info.color || rook?.type !== "r" || rook.color !== info.color) return false;

  const requiredEmpty = requiredEmptySquares(info);
  if (requiredEmpty.some((square) => board.has(square))) return false;

  const enemy = info.color === "w" ? "b" : "w";
  const ignored = new Set([info.kingStart, info.rookStart]);
  if (isSquareAttacked(board, info.kingStart, enemy, ignored)) return false;
  return kingPath(info).every((square) => !isSquareAttacked(board, square, enemy, ignored));
}

function makeCastlingMove(chess: Chess, info: Chess960CastlingInfo, kingSquare: Square) {
  return {
    color: info.color,
    from: kingSquare,
    to: info.uiTarget,
    piece: "k",
    captured: undefined,
    promotion: undefined,
    flags: info.side === "king" ? "k" : "q",
    san: info.san,
    lan: `${kingSquare}${info.uiTarget}`,
    before: chess.fen(),
    after: chess.fen()
  } as Move;
}

function originalKingSquare(fen: string, color: Color) {
  const rank = color === "w" ? 1 : 8;
  const backRank = fen.split("/")[color === "w" ? 7 : 0] ?? "";
  const expanded = expandFenRank(backRank);
  const index = expanded.findIndex((piece) => piece === (color === "w" ? "K" : "k"));
  return index >= 0 ? (`${files[index]}${rank}` as Square) : null;
}

function originalRookSquare(fen: string, color: Color, side: Chess960CastleSide) {
  const king = originalKingSquare(fen, color);
  if (!king) return null;
  const rank = color === "w" ? 1 : 8;
  const kingFile = fileIndex(king);
  const backRank = expandFenRank(fen.split("/")[color === "w" ? 7 : 0] ?? "");
  const rookIndexes = backRank
    .map((piece, index) => ({ piece, index }))
    .filter(({ piece }) => piece === (color === "w" ? "R" : "r"))
    .map(({ index }) => index);
  const candidates = side === "king" ? rookIndexes.filter((index) => index > kingFile) : rookIndexes.filter((index) => index < kingFile);
  const rookFile = side === "king" ? Math.min(...candidates) : Math.max(...candidates);
  return Number.isFinite(rookFile) ? (`${files[rookFile]}${rank}` as Square) : null;
}

function requiredEmptySquares(info: Chess960CastlingInfo) {
  const involved = new Set([info.kingStart, info.rookStart]);
  const squares = new Set<Square>();
  between(info.kingStart, info.rookStart).forEach((square) => squares.add(square));
  squares.add(info.kingFinal);
  squares.add(info.rookFinal);
  involved.forEach((square) => squares.delete(square));
  return [...squares];
}

function kingPath(info: Chess960CastlingInfo) {
  return betweenInclusive(info.kingStart, info.kingFinal).filter((square) => square !== info.kingStart);
}

function between(from: Square, to: Square) {
  return betweenInclusive(from, to).filter((square) => square !== from && square !== to);
}

function betweenInclusive(from: Square, to: Square) {
  const fromFile = fileIndex(from);
  const toFile = fileIndex(to);
  const rank = from[1];
  const step = Math.sign(toFile - fromFile);
  if (!step) return [from];
  const squares: Square[] = [];
  for (let file = fromFile; file !== toFile + step; file += step) {
    squares.push(`${files[file]}${rank}` as Square);
  }
  return squares;
}

function findKing(chess: Chess, color: Color) {
  for (const row of chess.board()) {
    for (const piece of row) {
      if (piece?.type === "k" && piece.color === color) return piece.square;
    }
  }
  return null;
}

function hasRight(fen: string, color: Color, side: Chess960CastleSide) {
  return (fen.split(/\s+/)[2] ?? "").includes(rightFlag(color, side));
}

function removeCastlingRights(fen: string, color: Color) {
  return removeColorRights(fen.split(/\s+/)[2] ?? "-", color);
}

function removeColorRights(rights: string, color: Color) {
  const stripped = rights.replace(color === "w" ? /[KQ]/g : /[kq]/g, "");
  return stripped === "-" ? "" : stripped;
}

function rightFlag(color: Color, side: Chess960CastleSide) {
  if (color === "w") return side === "king" ? "K" : "Q";
  return side === "king" ? "k" : "q";
}

function boardFromFen(fen: string) {
  const board = new Map<Square, BoardPiece>();
  const ranks = fen.split(/\s+/)[0].split("/");
  ranks.forEach((rankText, rankIndex) => {
    let file = 0;
    for (const char of rankText) {
      const empty = Number(char);
      if (Number.isFinite(empty) && empty > 0) {
        file += empty;
        continue;
      }
      const color: Color = char === char.toUpperCase() ? "w" : "b";
      board.set(`${files[file]}${8 - rankIndex}` as Square, { color, type: char.toLowerCase() as PieceSymbol });
      file += 1;
    }
  });
  return board;
}

function buildFenWithBoard(
  fen: string,
  board: Map<Square, BoardPiece>,
  updates: { turn: Color; castling: string; enPassant: string; halfmove: number; fullmove: number }
) {
  const ranks: string[] = [];
  for (let rank = 8; rank >= 1; rank -= 1) {
    let text = "";
    let empty = 0;
    for (const file of files) {
      const piece = board.get(`${file}${rank}` as Square);
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty) {
        text += String(empty);
        empty = 0;
      }
      const letter = piece.type;
      text += piece.color === "w" ? letter.toUpperCase() : letter;
    }
    if (empty) text += String(empty);
    ranks.push(text);
  }
  return `${ranks.join("/")} ${updates.turn} ${updates.castling || "-"} ${updates.enPassant} ${updates.halfmove} ${updates.fullmove}`;
}

function expandFenRank(rank: string) {
  return [...rank].flatMap((char) => {
    const empty = Number(char);
    return Number.isFinite(empty) && empty > 0 ? Array<string>(empty).fill("") : [char];
  });
}

function fileIndex(square: string) {
  return square.charCodeAt(0) - 97;
}

function isSquareAttacked(board: Map<Square, BoardPiece>, target: Square, byColor: Color, ignored: Set<Square>) {
  for (const [from, piece] of board) {
    if (piece.color !== byColor || ignored.has(from)) continue;
    if (pieceAttacks(board, from, piece, target, ignored)) return true;
  }
  return false;
}

function pieceAttacks(board: Map<Square, BoardPiece>, from: Square, piece: BoardPiece, target: Square, ignored: Set<Square>) {
  const df = fileIndex(target) - fileIndex(from);
  const dr = Number(target[1]) - Number(from[1]);
  if (piece.type === "p") {
    const dir = piece.color === "w" ? 1 : -1;
    return dr === dir && Math.abs(df) === 1;
  }
  if (piece.type === "n") return (Math.abs(df) === 1 && Math.abs(dr) === 2) || (Math.abs(df) === 2 && Math.abs(dr) === 1);
  if (piece.type === "k") return Math.max(Math.abs(df), Math.abs(dr)) === 1;

  const rookLine = df === 0 || dr === 0;
  const bishopLine = Math.abs(df) === Math.abs(dr);
  if (piece.type === "r" && !rookLine) return false;
  if (piece.type === "b" && !bishopLine) return false;
  if (piece.type === "q" && !rookLine && !bishopLine) return false;
  if (!rookLine && !bishopLine) return false;

  const stepFile = Math.sign(df);
  const stepRank = Math.sign(dr);
  let file = fileIndex(from) + stepFile;
  let rank = Number(from[1]) + stepRank;
  while (`${files[file]}${rank}` !== target) {
    const square = `${files[file]}${rank}` as Square;
    if (board.has(square) && !ignored.has(square)) return false;
    file += stepFile;
    rank += stepRank;
  }
  return true;
}
