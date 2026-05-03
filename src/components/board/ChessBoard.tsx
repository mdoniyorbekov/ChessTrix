import { Chess, type Move, type Square as ChessSquare } from "chess.js";
import { CSSProperties, PointerEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { publicAssetUrl } from "../../theme/assetPath";
import { useTheme } from "../../theme/ThemeProvider";
import { Piece } from "./Piece";
import { PromotionModal } from "./PromotionModal";
import { Square } from "./Square";
import "./board.css";

type ChessBoardProps = {
  chess: Chess;
  orientation?: "white" | "black";
  size?: number;
  showCoordinates?: boolean;
  lastMove?: { from: string; to: string } | null;
  hintMove?: { from: string; to: string } | null;
  bestMove?: { from: string; to: string } | null;
  premove?: { from: string; to: string } | null;
  premoves?: { from: string; to: string; promotion?: string }[];
  feedbackIcons?: Record<string, { src: string; label: string } | undefined>;
  premoveColor?: "w" | "b";
  allowPremove?: boolean;
  allowArrows?: boolean;
  legalMovesOverride?: Move[];
  onMove?: (from: string, to: string, promotion?: string) => boolean;
  onPremove?: (from: string, to: string, promotion?: string) => void;
  onCancelPremoves?: () => void;
  dropPiece?: { color: "w" | "b"; type: string } | null;
  onDrop?: (square: string) => boolean;
  disabled?: boolean;
};

type PendingPromotion = {
  from: string;
  to: string;
  color: "w" | "b";
};

type MovingPiece = {
  id: string;
  from: string;
  to: string;
  color: "w" | "b";
  type: string;
};

type DraggingPiece = {
  from: string;
  color: "w" | "b";
  type: string;
  x: number;
  y: number;
  started: boolean;
};

type AnnotationColor = "red" | "yellow" | "blue" | "green";
type BoardArrow = { from: string; to: string; color: AnnotationColor };
type SquareHighlight = { square: string; color: AnnotationColor };

const pieceMoveAnimationMs = 900;

export function ChessBoard({
  chess,
  orientation = "white",
  size = 640,
  showCoordinates = true,
  lastMove,
  hintMove,
  bestMove,
  premove,
  premoves,
  feedbackIcons,
  premoveColor,
  allowPremove,
  allowArrows = true,
  legalMovesOverride,
  onMove,
  onPremove,
  onCancelPremoves,
  dropPiece,
  onDrop,
  disabled
}: ChessBoardProps) {
  const { theme } = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [promotion, setPromotion] = useState<PendingPromotion | null>(null);
  const [movingPiece, setMovingPiece] = useState<MovingPiece | null>(null);
  const [draggingPiece, setDraggingPiece] = useState<DraggingPiece | null>(null);
  const [arrows, setArrows] = useState<BoardArrow[]>([]);
  const [highlights, setHighlights] = useState<SquareHighlight[]>([]);
  const [draftArrow, setDraftArrow] = useState<{ from: string; toX: number; toY: number; color: AnnotationColor } | null>(null);
  const lastAnimationId = useRef<string | null>(null);
  const skipAnimationId = useRef<string | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const suppressNextClick = useRef(false);
  const rightDrag = useRef<{ from: string; moved: boolean; color: AnnotationColor } | null>(null);
  const board = chess.board();
  const fen = chess.fen();
  const checkSquare = getCheckSquare(chess);
  const activePremoves = premoves ?? (premove ? [premove] : []);
  const lastSquares = new Set(lastMove ? [lastMove.from, lastMove.to] : []);
  const hintSquares = new Set(hintMove ? [hintMove.from, hintMove.to] : []);
  const bestMoveSquares = new Set(bestMove ? [bestMove.from, bestMove.to] : []);
  const premoveSquares = new Set(activePremoves.flatMap((move) => [move.from, move.to]));

  const squares = useMemo(() => {
    const files = orientation === "white" ? ["a", "b", "c", "d", "e", "f", "g", "h"] : ["h", "g", "f", "e", "d", "c", "b", "a"];
    const ranks = orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    return ranks.flatMap((rank) => files.map((file) => `${file}${rank}`));
  }, [orientation]);

  const pieces = new Map<string, { type: string; color: "w" | "b" }>();
  board.forEach((rank, rankIndex) => {
    rank.forEach((piece, fileIndex) => {
      if (piece) {
        const square = `${"abcdefgh"[fileIndex]}${8 - rankIndex}`;
        pieces.set(square, { type: piece.type, color: piece.color });
      }
    });
  });

  const visualPieces = createVisualPieces(pieces, activePremoves, premoveColor);
  const selectedPiece = selected ? visualPieces.get(selected) : undefined;
  const selectedIsPremove = Boolean(selectedPiece && selectedPiece.color !== chess.turn() && allowPremove && premoveColor === selectedPiece.color);
  const legalMoves: Move[] = selected && !selectedIsPremove
    ? (legalMovesOverride?.filter((move) => move.from === selected) ?? chess.moves({ square: selected as ChessSquare, verbose: true }))
    : [];
  const legalTargets = new Set(selected && selectedIsPremove ? getPremoveTargets(selected, visualPieces, premoveColor) : legalMoves.map((move) => move.to));

  const canInteractWithPiece = (color: "w" | "b") => color === chess.turn() || Boolean(allowPremove && premoveColor === color);

  useLayoutEffect(() => {
    if (!lastMove) return;

    const piece = chess.get(lastMove.to as ChessSquare);
    if (!piece) return;

    const id = `${lastMove.from}-${lastMove.to}`;
    if (lastAnimationId.current === id) return;
    if (skipAnimationId.current === id) {
      skipAnimationId.current = null;
      lastAnimationId.current = id;
      setMovingPiece(null);
      return;
    }

    lastAnimationId.current = id;
    setMovingPiece({
      id,
      from: lastMove.from,
      to: lastMove.to,
      color: piece.color,
      type: piece.type
    });

    const timeout = window.setTimeout(() => {
      setMovingPiece((current) => (current?.id === id ? null : current));
    }, pieceMoveAnimationMs + 80);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [chess, fen, lastMove]);

  const handleClick = (square: string) => {
    if (arrows.length || highlights.length) {
      setArrows([]);
      setHighlights([]);
    }
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    if (disabled) return;
    const piece = visualPieces.get(square);

    if (dropPiece && !piece) {
      const dropped = onDrop?.(square);
      if (dropped) setSelected(null);
      return;
    }

    if (!selected) {
      if (piece && canInteractWithPiece(piece.color)) setSelected(square);
      return;
    }

    if (selected === square) {
      setSelected(null);
      return;
    }

    if (piece && canInteractWithPiece(piece.color)) {
      setSelected(square);
      return;
    }

    if (!legalTargets.has(square)) {
      setSelected(null);
      return;
    }

    tryMove(selected, square);
  };

  const tryMove = (from: string, to: string) => {
    const selectedPiece = visualPieces.get(from);
    if (!selectedPiece) return false;
    const isPremove = selectedPiece.color !== chess.turn();
    const needsPromotion =
      selectedPiece?.type === "p" && ((selectedPiece.color === "w" && to[1] === "8") || (selectedPiece.color === "b" && to[1] === "1"));

    if (isPremove) {
      if (allowPremove && premoveColor === selectedPiece.color) {
        const targetPiece = visualPieces.get(to);
        if (targetPiece?.color === selectedPiece.color) {
          setSelected(null);
          return false;
        }
        onPremove?.(from, to, needsPromotion ? "q" : undefined);
        setSelected(null);
        return true;
      }
      return false;
    }

    if (needsPromotion) {
      setPromotion({ from, to, color: selectedPiece.color });
      return false;
    }

    const moved = onMove?.(from, to);
    if (moved) setSelected(null);
    return Boolean(moved);
  };

  const startDrag = (square: string, event: PointerEvent<HTMLButtonElement>) => {
    if (event.button === 2) {
      startRightDrag(square, event);
      return;
    }
    if (event.button !== 0) return;
    if (disabled || dropPiece) return;
    const visualPiece = visualPieces.get(square);
    if (!visualPiece || !canInteractWithPiece(visualPiece.color)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelected(square);
    setDraggingPiece({ from: square, color: visualPiece.color, type: visualPiece.type, x: event.clientX, y: event.clientY, started: false });
  };

  const updateDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (rightDrag.current && allowArrows) {
      rightDrag.current.moved = true;
      const rect = boardRef.current?.getBoundingClientRect();
      if (rect) setDraftArrow({ from: rightDrag.current.from, toX: event.clientX - rect.left, toY: event.clientY - rect.top, color: rightDrag.current.color });
      return;
    }
    if (!draggingPiece) return;
    setDraggingPiece((current) => current ? { ...current, x: event.clientX, y: event.clientY, started: true } : current);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (rightDrag.current) {
      finishRightDrag(event);
      return;
    }
    if (!draggingPiece) return;
    const targetSquare = squareFromClientPoint(event.clientX, event.clientY, orientation, boardRef.current);
    const wasDragging = draggingPiece.started;
    if (targetSquare && targetSquare !== draggingPiece.from) {
      skipAnimationId.current = `${draggingPiece.from}-${targetSquare}`;
      tryMove(draggingPiece.from, targetSquare);
      suppressNextClick.current = true;
    } else if (wasDragging) {
      suppressNextClick.current = true;
    }
    setDraggingPiece(null);
  };

  const completePromotion = (piece: "q" | "r" | "b" | "n") => {
    if (promotion) {
      const moved = onMove?.(promotion.from, promotion.to, piece);
      if (moved) {
        setSelected(null);
        setPromotion(null);
      }
    }
  };

  const movingStyle = movingPiece ? createMovingPieceStyle(movingPiece, orientation, size) : undefined;

  const startRightDrag = (square: string, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const color = annotationColorFromEvent(event, "arrow");
    rightDrag.current = { from: square, moved: false, color };
    const rect = boardRef.current?.getBoundingClientRect();
    if (rect && allowArrows) setDraftArrow({ from: square, toX: event.clientX - rect.left, toY: event.clientY - rect.top, color });
  };

  const finishRightDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = rightDrag.current;
    rightDrag.current = null;
    setDraftArrow(null);
    const target = squareFromClientPoint(event.clientX, event.clientY, orientation, boardRef.current);
    if (allowArrows && drag?.moved && target && target !== drag.from) {
      setArrows((current) => toggleArrow(current, { from: drag.from, to: target, color: drag.color }));
      return;
    }
    if (allowArrows && drag && activePremoves.length === 0) {
      setHighlights((current) => toggleHighlight(current, { square: drag.from, color: annotationColorFromEvent(event, "square") }));
      return;
    }
    onCancelPremoves?.();
  };

  return (
    <div className="board-shell" style={{ width: size }}>
      <div
        ref={boardRef}
        className="chess-board"
        onPointerMove={updateDrag}
        onPointerUp={endDrag}
        onPointerCancel={() => setDraggingPiece(null)}
        onContextMenu={(event) => event.preventDefault()}
        style={{
          width: size,
          height: size,
          backgroundImage: theme.boardImage ? `url("${publicAssetUrl(theme.boardImage)}")` : undefined
        }}
      >
        {squares.map((square) => {
          const fileChar = square[0];
          const file = fileChar.charCodeAt(0) - 97;
          const rank = Number(square[1]);
          const light = (file + rank) % 2 === 0;
          const piece = visualPieces.get(square);
          const bottomRank = orientation === "white" ? 1 : 8;
          const leftFile = orientation === "white" ? "a" : "h";
          const annotation = highlights.find((item) => item.square === square);
          return (
            <Square
              key={square}
              name={square}
              light={light}
              selected={selected === square}
              legal={legalTargets.has(square)}
              premove={premoveSquares.has(square)}
              hint={hintSquares.has(square) || bestMoveSquares.has(square)}
              annotationColor={annotation?.color}
              lastMove={lastSquares.has(square)}
              check={checkSquare === square}
              showCoordinates={showCoordinates}
              fileLabel={rank === bottomRank ? fileChar : undefined}
              rankLabel={fileChar === leftFile ? String(rank) : undefined}
              feedbackIcon={feedbackIcons?.[square]}
              onClick={() => handleClick(square)}
              onPointerDown={(event) => startDrag(square, event)}
            >
              {piece && movingPiece?.to !== square && draggingPiece?.from !== square && <Piece color={piece.color} type={piece.type} />}
            </Square>
          );
        })}
        <ArrowOverlay arrows={bestMove ? [...arrows, { from: bestMove.from, to: bestMove.to, color: "blue" as AnnotationColor }] : arrows} draftArrow={draftArrow} orientation={orientation} boardSize={size} />
      </div>
      {movingPiece && movingStyle && (
        <div
          key={movingPiece.id}
          className="moving-piece"
          style={movingStyle}
          onTransitionEnd={() => setMovingPiece((current) => (current?.id === movingPiece.id ? null : current))}
          onAnimationEnd={() => setMovingPiece((current) => (current?.id === movingPiece.id ? null : current))}
        >
          <Piece color={movingPiece.color} type={movingPiece.type} />
        </div>
      )}
      {draggingPiece && (
        <div className="dragging-piece" style={{ left: draggingPiece.x, top: draggingPiece.y }}>
          <Piece color={draggingPiece.color} type={draggingPiece.type} />
        </div>
      )}
      {promotion && <PromotionModal color={promotion.color} onSelect={completePromotion} />}
    </div>
  );
}

function squareFromClientPoint(clientX: number, clientY: number, orientation: "white" | "black", board: HTMLDivElement | null) {
  if (!board) return null;
  const rect = board.getBoundingClientRect();
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
  const squareSize = rect.width / 8;
  const boardFile = Math.min(7, Math.max(0, Math.floor((clientX - rect.left) / squareSize)));
  const boardRank = Math.min(7, Math.max(0, Math.floor((clientY - rect.top) / squareSize)));
  const file = orientation === "white" ? boardFile : 7 - boardFile;
  const rank = orientation === "white" ? 8 - boardRank : boardRank + 1;
  return `${String.fromCharCode(97 + file)}${rank}`;
}

function ArrowOverlay({
  arrows,
  draftArrow,
  orientation,
  boardSize
}: {
  arrows: BoardArrow[];
  draftArrow: { from: string; toX: number; toY: number; color: AnnotationColor } | null;
  orientation: "white" | "black";
  boardSize: number;
}) {
  if (!arrows.length && !draftArrow) return null;
  const squareSize = boardSize / 8;
  return (
    <svg className="board-arrows" viewBox={`0 0 ${boardSize} ${boardSize}`} aria-hidden="true">
      <defs>
        {(["yellow", "red", "blue", "green"] as AnnotationColor[]).map((color) => (
          <marker key={color} id={`chesstrix-arrowhead-${color}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
            <path className={`board-arrows__head board-arrows--${color}`} d="M 0 0 L 8 4 L 0 8 z" />
          </marker>
        ))}
      </defs>
      {arrows.map((arrow, index) => {
        const from = squareCenter(arrow.from, orientation, squareSize);
        const to = squareCenter(arrow.to, orientation, squareSize);
        return <line key={`${arrow.from}-${arrow.to}-${index}`} className={`board-arrows--${arrow.color}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} markerEnd={`url(#chesstrix-arrowhead-${arrow.color})`} />;
      })}
      {draftArrow && (() => {
        const from = squareCenter(draftArrow.from, orientation, squareSize);
        return <line className={`board-arrows__draft board-arrows--${draftArrow.color}`} x1={from.x} y1={from.y} x2={draftArrow.toX} y2={draftArrow.toY} markerEnd={`url(#chesstrix-arrowhead-${draftArrow.color})`} />;
      })()}
    </svg>
  );
}

function squareCenter(square: string, orientation: "white" | "black", squareSize: number) {
  const point = squareToPoint(square, orientation, squareSize);
  return { x: point.x + squareSize / 2, y: point.y + squareSize / 2 };
}

function toggleArrow(arrows: BoardArrow[], next: BoardArrow) {
  const exists = arrows.some((arrow) => arrow.from === next.from && arrow.to === next.to && arrow.color === next.color);
  return exists ? arrows.filter((arrow) => arrow.from !== next.from || arrow.to !== next.to || arrow.color !== next.color) : [...arrows, next];
}

function toggleHighlight(highlights: SquareHighlight[], next: SquareHighlight) {
  const exists = highlights.some((item) => item.square === next.square && item.color === next.color);
  return exists ? highlights.filter((item) => item.square !== next.square || item.color !== next.color) : [...highlights.filter((item) => item.square !== next.square), next];
}

function annotationColorFromEvent(event: PointerEvent, type: "arrow" | "square"): AnnotationColor {
  if (event.ctrlKey) return type === "arrow" ? "red" : "yellow";
  if (event.altKey) return "blue";
  if (event.shiftKey) return "green";
  return type === "arrow" ? "yellow" : "red";
}

function createVisualPieces(
  pieces: Map<string, { type: string; color: "w" | "b" }>,
  premoves: { from: string; to: string; promotion?: string }[],
  premoveColor?: "w" | "b"
) {
  const visual = new Map(pieces);
  for (const move of premoves) {
    const piece = visual.get(move.from);
    if (!piece || piece.color !== premoveColor) continue;
    const target = visual.get(move.to);
    if (target?.color === piece.color) continue;
    visual.delete(move.from);
    visual.delete(move.to);
    visual.set(move.to, { ...piece, type: move.promotion ?? piece.type });
  }
  return visual;
}

function getPremoveTargets(from: string, pieces: Map<string, { type: string; color: "w" | "b" }>, color?: "w" | "b") {
  if (!color) return [];
  const targets: string[] = [];
  for (const file of "abcdefgh") {
    for (let rank = 1; rank <= 8; rank += 1) {
      const square = `${file}${rank}`;
      if (square === from) continue;
      if (pieces.get(square)?.color !== color) targets.push(square);
    }
  }
  return targets;
}

function createMovingPieceStyle(piece: MovingPiece, orientation: "white" | "black", boardSize: number): CSSProperties {
  const squareSize = boardSize / 8;
  const from = squareToPoint(piece.from, orientation, squareSize);
  const to = squareToPoint(piece.to, orientation, squareSize);

  return {
    width: squareSize,
    height: squareSize,
    "--piece-move-duration": `${pieceMoveAnimationMs}ms`,
    "--from-x": `${from.x}px`,
    "--from-y": `${from.y}px`,
    "--to-x": `${to.x}px`,
    "--to-y": `${to.y}px`
  } as CSSProperties;
}

function squareToPoint(square: string, orientation: "white" | "black", squareSize: number) {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  const x = orientation === "white" ? file : 7 - file;
  const y = orientation === "white" ? 8 - rank : rank - 1;

  return {
    x: x * squareSize,
    y: y * squareSize
  };
}

function getCheckSquare(chess: Chess) {
  if (!chess.isCheck()) return null;
  const targetColor = chess.turn();
  for (const row of chess.board()) {
    for (const piece of row) {
      if (piece?.type === "k" && piece.color === targetColor) {
        return piece.square;
      }
    }
  }
  return null;
}
