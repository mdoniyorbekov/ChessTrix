export type FourPlayerColor = "red" | "blue" | "yellow" | "green";
export type FourPlayerPieceType = "king" | "queen" | "rook" | "bishop" | "knight" | "pawn";

export type FourPlayerPiece = {
  id: string;
  color: FourPlayerColor;
  type: FourPlayerPieceType;
  square: string;
  active: boolean;
  dead?: boolean;
};

export type FourPlayerState = {
  turnIndex: number;
  players: FourPlayerColor[];
  pieces: FourPlayerPiece[];
  eliminated: FourPlayerColor[];
  scores: Record<FourPlayerColor, number>;
  log: string[];
  winner?: FourPlayerColor;
  castlingRights: Record<FourPlayerColor, { low: boolean; high: boolean }>;
};

const boardSize = 14;
const pieceValues: Record<FourPlayerPieceType, number> = {
  king: 20,
  queen: 9,
  rook: 5,
  bishop: 5,
  knight: 3,
  pawn: 1
};

const backRank: FourPlayerPieceType[] = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
const players: FourPlayerColor[] = ["red", "blue", "yellow", "green"];

export function createFourPlayerState(): FourPlayerState {
  return {
    turnIndex: 0,
    players,
    pieces: createInitialPieces(),
    eliminated: [],
    scores: { red: 0, blue: 0, yellow: 0, green: 0 },
    log: ["Free-for-all local game started"],
    winner: undefined,
    castlingRights: createInitialCastlingRights()
  };
}

export function currentPlayer(state: FourPlayerState) {
  return state.players[state.turnIndex % state.players.length];
}

export function isPlayableFourSquare(square: string) {
  const { file, rank } = parseSquare(square);
  const inLeftOrRightCorner = file < 3 || file > 10;
  const inTopOrBottomCorner = rank < 3 || rank > 10;
  return !(inLeftOrRightCorner && inTopOrBottomCorner);
}

export function isFourPlayerInCheck(state: FourPlayerState, color: FourPlayerColor) {
  return isKingInCheck(state, color);
}

export function legalFourPlayerTargets(state: FourPlayerState, pieceId: string) {
  const piece = state.pieces.find((item) => item.id === pieceId && item.active && !item.dead);
  if (!piece || state.eliminated.includes(piece.color)) return [];

  return [...pseudoFourPlayerTargets(state, piece), ...fourPlayerCastlingTargets(state, piece)].filter((to) => moveKeepsOwnKingSafe(state, piece, to));
}

export function moveFourPlayerPiece(state: FourPlayerState, pieceId: string, to: string) {
  const piece = state.pieces.find((item) => item.id === pieceId && item.active && !item.dead);
  if (!piece || piece.color !== currentPlayer(state) || state.eliminated.includes(piece.color)) return false;
  if (!legalFourPlayerTargets(state, pieceId).includes(to)) return false;

  const castle = piece.type === "king" ? getFourPlayerCastlingRule(state, piece, to) : null;
  if (castle) {
    executeFourPlayerCastling(state, piece, castle);
    advanceTurn(state);
    resolveCurrentTurnOutcome(state, piece.color);
    updateWinner(state);
    return true;
  }

  const target = state.pieces.find((item) => item.square === to && item.active);
  if (target) {
    target.active = false;
    if (!target.dead) {
      state.scores[piece.color] += pieceValues[target.type];
      state.log.unshift(`${label(piece.color)} captured ${label(target.color)} ${target.type} (+${pieceValues[target.type]})`);
    } else {
      state.log.unshift(`${label(piece.color)} cleared a dead ${label(target.color)} ${target.type}`);
    }
  } else {
    state.log.unshift(`${label(piece.color)} moved ${piece.type}`);
  }

  piece.square = to;
  updateFourPlayerCastlingRightsAfterMove(state, piece, target);
  promotePawnIfNeeded(state, piece);
  scoreMultiCheck(state, piece);
  advanceTurn(state);
  resolveCurrentTurnOutcome(state, piece.color);
  updateWinner(state);
  return true;
}

function pseudoFourPlayerTargets(state: FourPlayerState, piece: FourPlayerPiece) {
  const occupied = activePiecesBySquare(state);
  const targets: string[] = [];

  const add = (file: number, rank: number) => {
    const square = toSquare(file, rank);
    if (!square || !isPlayableFourSquare(square)) return false;
    const target = occupied.get(square);
    if (target?.color === piece.color) return false;
    if (target?.type === "king" && !target.dead) return false;
    targets.push(square);
    return !target;
  };

  const ray = (df: number, dr: number) => {
    const start = parseSquare(piece.square);
    for (let step = 1; step < boardSize; step += 1) {
      if (!add(start.file + df * step, start.rank + dr * step)) break;
    }
  };

  const { file, rank } = parseSquare(piece.square);
  if (piece.type === "rook" || piece.type === "queen") {
    directions.rook.forEach(([df, dr]) => ray(df, dr));
  }
  if (piece.type === "bishop" || piece.type === "queen") {
    directions.bishop.forEach(([df, dr]) => ray(df, dr));
  }
  if (piece.type === "king") {
    directions.king.forEach(([df, dr]) => add(file + df, rank + dr));
  }
  if (piece.type === "knight") {
    directions.knight.forEach(([df, dr]) => add(file + df, rank + dr));
  }
  if (piece.type === "pawn") {
    const { df, dr, startFiles, startRanks } = pawnDirection(piece.color);
    const one = toSquare(file + df, rank + dr);
    if (one && isPlayableFourSquare(one) && !occupied.has(one)) {
      targets.push(one);
      const two = toSquare(file + df * 2, rank + dr * 2);
      const onStartLine = startRanks.includes(rank) || startFiles.includes(file);
      if (onStartLine && two && isPlayableFourSquare(two) && !occupied.has(two)) targets.push(two);
    }
    for (const [cdf, cdr] of pawnCaptures(piece.color)) {
      const capture = toSquare(file + cdf, rank + cdr);
      const target = capture ? occupied.get(capture) : undefined;
      if (capture && isPlayableFourSquare(capture) && target && target.color !== piece.color && (target.type !== "king" || target.dead)) {
        targets.push(capture);
      }
    }
  }

  return targets;
}

function moveKeepsOwnKingSafe(state: FourPlayerState, piece: FourPlayerPiece, to: string) {
  const castle = piece.type === "king" ? getFourPlayerCastlingRule(state, piece, to) : null;
  const next = cloneState(state);
  const moving = next.pieces.find((item) => item.id === piece.id);
  if (!moving) return false;
  if (castle) {
    const nextCastle = getFourPlayerCastlingRule(next, moving, to);
    if (!nextCastle) return false;
    executeFourPlayerCastling(next, moving, nextCastle, false);
  } else {
    const target = next.pieces.find((item) => item.square === to && item.active);
    if (target) target.active = false;
    moving.square = to;
    promotePawnIfNeeded(next, moving);
  }
  return !isKingInCheck(next, piece.color);
}

function isKingInCheck(state: FourPlayerState, color: FourPlayerColor) {
  if (state.eliminated.includes(color)) return false;
  const king = state.pieces.find((piece) => piece.color === color && piece.type === "king" && piece.active && !piece.dead);
  if (!king) return false;
  return state.pieces.some((piece) => piece.active && !piece.dead && piece.color !== color && pieceAttacksSquare(state, piece, king.square));
}

function pieceAttacksSquare(state: FourPlayerState, piece: FourPlayerPiece, targetSquare: string) {
  const from = parseSquare(piece.square);
  const target = parseSquare(targetSquare);
  const df = target.file - from.file;
  const dr = target.rank - from.rank;
  const occupied = activePiecesBySquare(state);

  if (piece.type === "pawn") {
    return pawnCaptures(piece.color).some(([cdf, cdr]) => cdf === df && cdr === dr);
  }
  if (piece.type === "king") {
    return Math.abs(df) <= 1 && Math.abs(dr) <= 1 && (df !== 0 || dr !== 0);
  }
  if (piece.type === "knight") {
    return directions.knight.some(([kdf, kdr]) => kdf === df && kdr === dr);
  }

  const rookLine = df === 0 || dr === 0;
  const bishopLine = Math.abs(df) === Math.abs(dr);
  if (piece.type === "rook" && !rookLine) return false;
  if (piece.type === "bishop" && !bishopLine) return false;
  if (piece.type === "queen" && !rookLine && !bishopLine) return false;

  const stepFile = Math.sign(df);
  const stepRank = Math.sign(dr);
  let file = from.file + stepFile;
  let rank = from.rank + stepRank;
  while (file !== target.file || rank !== target.rank) {
    const square = toSquare(file, rank);
    if (!square || !isPlayableFourSquare(square) || occupied.has(square)) return false;
    file += stepFile;
    rank += stepRank;
  }
  return true;
}

function resolveCurrentTurnOutcome(state: FourPlayerState, scorer: FourPlayerColor) {
  while (!state.winner) {
    const player = currentPlayer(state);
    if (state.eliminated.includes(player)) {
      advanceTurn(state);
      continue;
    }

    const inCheck = isKingInCheck(state, player);
    const hasMove = hasAnyLegalMove(state, player);
    if (inCheck && !hasMove) {
      eliminatePlayer(state, player);
      state.scores[scorer] += 20;
      state.log.unshift(`${label(scorer)} checkmated ${label(player)} (+20)`);
      advanceTurn(state);
      updateWinner(state);
      continue;
    }
    if (!inCheck && !hasMove) {
      state.scores[player] += 20;
      eliminatePlayer(state, player);
      state.log.unshift(`${label(player)} was stalemated (+20)`);
      advanceTurn(state);
      updateWinner(state);
      continue;
    }
    if (inCheck) state.log.unshift(`${label(player)} is in check`);
    break;
  }
}

function hasAnyLegalMove(state: FourPlayerState, color: FourPlayerColor) {
  return state.pieces.some((piece) => piece.color === color && piece.active && !piece.dead && legalFourPlayerTargets(state, piece.id).length > 0);
}

function eliminatePlayer(state: FourPlayerState, color: FourPlayerColor) {
  if (state.eliminated.includes(color)) return;
  state.eliminated.push(color);
  state.pieces.forEach((piece) => {
    if (piece.color === color && piece.active) piece.dead = true;
  });
}

function scoreMultiCheck(state: FourPlayerState, piece: FourPlayerPiece) {
  const checked = state.players.filter((player) => player !== piece.color && !state.eliminated.includes(player) && isKingInCheck(state, player));
  if (checked.length < 2) return;
  const bonus = checked.length === 3 ? (piece.type === "queen" ? 5 : 20) : piece.type === "queen" ? 1 : 5;
  state.scores[piece.color] += bonus;
  state.log.unshift(`${label(piece.color)} checked ${checked.length} kings (+${bonus})`);
}

function promotePawnIfNeeded(state: FourPlayerState, piece: FourPlayerPiece) {
  if (piece.type !== "pawn") return;
  const { file, rank } = parseSquare(piece.square);
  const promotes =
    (piece.color === "red" && rank <= 6) ||
    (piece.color === "yellow" && rank >= 7) ||
    (piece.color === "green" && file >= 7) ||
    (piece.color === "blue" && file <= 6);
  if (promotes) {
    piece.type = "queen";
    state.log.unshift(`${label(piece.color)} promoted a pawn`);
  }
}

function createInitialPieces() {
  const pieces: FourPlayerPiece[] = [];
  const add = (color: FourPlayerColor, type: FourPlayerPieceType, square: string, index: number) => {
    pieces.push({ id: `${color}-${type}-${index}`, color, type, square, active: true });
  };

  for (let i = 0; i < 8; i += 1) {
    add("red", backRank[i], toSquare(i + 3, 13)!, i);
    add("red", "pawn", toSquare(i + 3, 12)!, i);
    add("yellow", backRank[7 - i], toSquare(i + 3, 0)!, i);
    add("yellow", "pawn", toSquare(i + 3, 1)!, i);
    add("green", backRank[i], toSquare(0, i + 3)!, i);
    add("green", "pawn", toSquare(1, i + 3)!, i);
    add("blue", backRank[7 - i], toSquare(13, i + 3)!, i);
    add("blue", "pawn", toSquare(12, i + 3)!, i);
  }

  return pieces;
}

function createInitialCastlingRights(): Record<FourPlayerColor, { low: boolean; high: boolean }> {
  return {
    red: { low: true, high: true },
    blue: { low: true, high: true },
    yellow: { low: true, high: true },
    green: { low: true, high: true }
  };
}

type FourPlayerCastlingRule = {
  color: FourPlayerColor;
  side: "low" | "high";
  kingStartSquare: string;
  rookStartSquare: string;
  kingFinalSquare: string;
  rookFinalSquare: string;
  uiTargetSquare: string;
  kingPathSquares: string[];
  requiredEmptySquares: string[];
};

function fourPlayerCastlingTargets(state: FourPlayerState, piece: FourPlayerPiece) {
  if (piece.type !== "king" || state.eliminated.includes(piece.color)) return [];
  return (["low", "high"] as const)
    .map((side) => getFourPlayerCastlingRuleBySide(state, piece.color, side))
    .filter((rule): rule is FourPlayerCastlingRule => Boolean(rule && canFourPlayerCastle(state, rule)))
    .map((rule) => rule.uiTargetSquare);
}

function getFourPlayerCastlingRule(state: FourPlayerState, king: FourPlayerPiece, targetSquare: string) {
  return (["low", "high"] as const)
    .map((side) => getFourPlayerCastlingRuleBySide(state, king.color, side))
    .find((rule): rule is FourPlayerCastlingRule =>
      Boolean(rule && canFourPlayerCastle(state, rule) && king.square === rule.kingStartSquare && (targetSquare === rule.uiTargetSquare || targetSquare === rule.kingFinalSquare || targetSquare === rule.rookStartSquare))
    ) ?? null;
}

function getFourPlayerCastlingRuleBySide(state: FourPlayerState, color: FourPlayerColor, side: "low" | "high"): FourPlayerCastlingRule | null {
  const home = fourPlayerHomeLine(color);
  const king = state.pieces.find((piece) => piece.color === color && piece.type === "king" && piece.active && !piece.dead);
  const rookStartSquare = side === "low" ? home.lowRook : home.highRook;
  const rook = state.pieces.find((piece) => piece.color === color && piece.type === "rook" && piece.square === rookStartSquare && piece.active && !piece.dead);
  if (!king || king.square !== home.king || !rook || !state.castlingRights[color][side]) return null;
  const kingFinalSquare = side === "low" ? home.lowKingFinal : home.highKingFinal;
  const rookFinalSquare = side === "low" ? home.lowRookFinal : home.highRookFinal;
  const requiredEmptySquares = uniqueSquares([
    ...lineBetween(home.king, rookStartSquare),
    kingFinalSquare,
    rookFinalSquare
  ]).filter((square) => square !== home.king && square !== rookStartSquare);

  return {
    color,
    side,
    kingStartSquare: home.king,
    rookStartSquare,
    kingFinalSquare,
    rookFinalSquare,
    uiTargetSquare: kingFinalSquare === home.king ? rookStartSquare : kingFinalSquare,
    kingPathSquares: lineBetweenInclusive(home.king, kingFinalSquare).filter((square) => square !== home.king),
    requiredEmptySquares
  };
}

function canFourPlayerCastle(state: FourPlayerState, rule: FourPlayerCastlingRule) {
  const occupied = activePiecesBySquare(state);
  if (rule.requiredEmptySquares.some((square) => occupied.has(square))) return false;
  if (isKingInCheck(state, rule.color)) return false;
  return rule.kingPathSquares.every((square) => !isFourPlayerSquareAttackedDuringCastle(state, square, rule.color, new Set([rule.kingStartSquare, rule.rookStartSquare])));
}

function executeFourPlayerCastling(state: FourPlayerState, king: FourPlayerPiece, rule: FourPlayerCastlingRule, writeLog = true) {
  const rook = state.pieces.find((piece) => piece.color === rule.color && piece.type === "rook" && piece.square === rule.rookStartSquare && piece.active && !piece.dead);
  if (!rook) return false;

  // The king and rook can cross or already occupy final squares, so clear the
  // rights first and then assign both destinations atomically.
  king.square = rule.kingFinalSquare;
  rook.square = rule.rookFinalSquare;
  state.castlingRights[rule.color] = { low: false, high: false };
  if (writeLog) state.log.unshift(`${label(rule.color)} castled ${rule.side === "high" ? "kingside" : "queenside"}`);
  return true;
}

function updateFourPlayerCastlingRightsAfterMove(state: FourPlayerState, piece: FourPlayerPiece, captured?: FourPlayerPiece) {
  if (piece.type === "king") {
    state.castlingRights[piece.color] = { low: false, high: false };
  }
  if (piece.type === "rook") {
    if (piece.id.endsWith("-0")) state.castlingRights[piece.color].low = false;
    if (piece.id.endsWith("-7")) state.castlingRights[piece.color].high = false;
  }
  if (captured?.type === "rook") {
    const home = fourPlayerHomeLine(captured.color);
    if (captured.square === home.lowRook) state.castlingRights[captured.color].low = false;
    if (captured.square === home.highRook) state.castlingRights[captured.color].high = false;
  }
}

function fourPlayerHomeLine(color: FourPlayerColor) {
  const makeHorizontal = (rank: number, kingFile: number) => ({
    king: toSquare(kingFile, rank)!,
    lowRook: toSquare(3, rank)!,
    highRook: toSquare(10, rank)!,
    lowKingFinal: toSquare(5, rank)!,
    lowRookFinal: toSquare(6, rank)!,
    highKingFinal: toSquare(9, rank)!,
    highRookFinal: toSquare(8, rank)!
  });
  const makeVertical = (file: number, kingRank: number) => ({
    king: toSquare(file, kingRank)!,
    lowRook: toSquare(file, 3)!,
    highRook: toSquare(file, 10)!,
    lowKingFinal: toSquare(file, 5)!,
    lowRookFinal: toSquare(file, 6)!,
    highKingFinal: toSquare(file, 9)!,
    highRookFinal: toSquare(file, 8)!
  });
  if (color === "red") return makeHorizontal(13, 7);
  if (color === "yellow") return makeHorizontal(0, 6);
  if (color === "green") return makeVertical(0, 7);
  return makeVertical(13, 6);
}

function isFourPlayerSquareAttackedDuringCastle(state: FourPlayerState, square: string, color: FourPlayerColor, ignored: Set<string>) {
  return state.pieces.some((piece) => piece.active && !piece.dead && piece.color !== color && !ignored.has(piece.square) && pieceAttacksSquareWithIgnored(state, piece, square, ignored));
}

function pieceAttacksSquareWithIgnored(state: FourPlayerState, piece: FourPlayerPiece, targetSquare: string, ignored: Set<string>) {
  const from = parseSquare(piece.square);
  const target = parseSquare(targetSquare);
  const df = target.file - from.file;
  const dr = target.rank - from.rank;
  const occupied = activePiecesBySquare(state);

  if (piece.type === "pawn") return pawnCaptures(piece.color).some(([cdf, cdr]) => cdf === df && cdr === dr);
  if (piece.type === "king") return Math.abs(df) <= 1 && Math.abs(dr) <= 1 && (df !== 0 || dr !== 0);
  if (piece.type === "knight") return directions.knight.some(([kdf, kdr]) => kdf === df && kdr === dr);

  const rookLine = df === 0 || dr === 0;
  const bishopLine = Math.abs(df) === Math.abs(dr);
  if (piece.type === "rook" && !rookLine) return false;
  if (piece.type === "bishop" && !bishopLine) return false;
  if (piece.type === "queen" && !rookLine && !bishopLine) return false;

  const stepFile = Math.sign(df);
  const stepRank = Math.sign(dr);
  let file = from.file + stepFile;
  let rank = from.rank + stepRank;
  while (file !== target.file || rank !== target.rank) {
    const current = toSquare(file, rank);
    if (!current || !isPlayableFourSquare(current) || (occupied.has(current) && !ignored.has(current))) return false;
    file += stepFile;
    rank += stepRank;
  }
  return true;
}

function lineBetween(from: string, to: string) {
  return lineBetweenInclusive(from, to).filter((square) => square !== from && square !== to);
}

function lineBetweenInclusive(from: string, to: string) {
  const start = parseSquare(from);
  const end = parseSquare(to);
  const stepFile = Math.sign(end.file - start.file);
  const stepRank = Math.sign(end.rank - start.rank);
  const squares: string[] = [];
  let file = start.file;
  let rank = start.rank;
  while (file !== end.file || rank !== end.rank) {
    const square = toSquare(file, rank);
    if (square) squares.push(square);
    file += stepFile;
    rank += stepRank;
  }
  const endSquare = toSquare(end.file, end.rank);
  if (endSquare) squares.push(endSquare);
  return squares;
}

function uniqueSquares(squares: string[]) {
  return [...new Set(squares)];
}

function updateWinner(state: FourPlayerState) {
  const alive = state.players.filter((player) => !state.eliminated.includes(player));
  if (alive.length === 1) {
    state.winner = alive[0];
    state.scores[alive[0]] += 20;
    state.log.unshift(`${label(alive[0])} is the last player standing (+20)`);
  }
}

function advanceTurn(state: FourPlayerState) {
  do {
    state.turnIndex += 1;
  } while (state.eliminated.includes(currentPlayer(state)) && state.eliminated.length < 3);
}

function activePiecesBySquare(state: FourPlayerState) {
  return new Map(state.pieces.filter((item) => item.active).map((item) => [item.square, item]));
}

function cloneState(state: FourPlayerState): FourPlayerState {
  return {
    ...state,
    players: [...state.players],
    eliminated: [...state.eliminated],
    scores: { ...state.scores },
    log: [...state.log],
    castlingRights: {
      red: { ...state.castlingRights.red },
      blue: { ...state.castlingRights.blue },
      yellow: { ...state.castlingRights.yellow },
      green: { ...state.castlingRights.green }
    },
    pieces: state.pieces.map((piece) => ({ ...piece }))
  };
}

function pawnDirection(color: FourPlayerColor) {
  if (color === "red") return { df: 0, dr: -1, startRanks: [12], startFiles: [] as number[] };
  if (color === "yellow") return { df: 0, dr: 1, startRanks: [1], startFiles: [] as number[] };
  if (color === "green") return { df: 1, dr: 0, startRanks: [] as number[], startFiles: [1] };
  return { df: -1, dr: 0, startRanks: [] as number[], startFiles: [12] };
}

function pawnCaptures(color: FourPlayerColor) {
  if (color === "red") return [[-1, -1], [1, -1]];
  if (color === "yellow") return [[-1, 1], [1, 1]];
  if (color === "green") return [[1, -1], [1, 1]];
  return [[-1, -1], [-1, 1]];
}

function parseSquare(square: string) {
  return { file: square.charCodeAt(0) - 97, rank: Number(square.slice(1)) - 1 };
}

function toSquare(file: number, rank: number) {
  if (file < 0 || file >= boardSize || rank < 0 || rank >= boardSize) return null;
  return `${String.fromCharCode(97 + file)}${rank + 1}`;
}

function label(color: FourPlayerColor) {
  return color[0].toUpperCase() + color.slice(1);
}

const directions = {
  rook: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  bishop: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  king: [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]],
  knight: [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]
} satisfies Record<string, number[][]>;
