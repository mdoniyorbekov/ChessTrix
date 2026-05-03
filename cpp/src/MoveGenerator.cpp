#include "chesstrix/MoveGenerator.hpp"
#include "chesstrix/Bishop.hpp"
#include "chesstrix/King.hpp"
#include "chesstrix/Knight.hpp"
#include "chesstrix/Pawn.hpp"
#include "chesstrix/Queen.hpp"
#include "chesstrix/Rook.hpp"
#include <algorithm>
#include <cctype>
#include <cmath>

namespace chesstrix {

namespace {

int colorIndex(Color color) {
  return color == Color::White ? 0 : 1;
}

bool sameLine(Position a, Position b) {
  return a.rank == b.rank;
}

std::vector<Position> betweenInclusive(Position from, Position to) {
  std::vector<Position> squares;
  if (!sameLine(from, to)) return squares;
  const int step = (to.file > from.file) ? 1 : (to.file < from.file ? -1 : 0);
  if (step == 0) {
    squares.push_back(from);
    return squares;
  }
  for (int file = from.file; file != to.file + step; file += step) squares.push_back(Position{file, from.rank});
  return squares;
}

bool clearSquaresForCastle(const Board& board, const std::vector<Position>& squares, Position kingStart, Position rookStart) {
  for (Position square : squares) {
    if (square == kingStart || square == rookStart) continue;
    if (!board.isEmpty(square)) return false;
  }
  return true;
}

std::unique_ptr<Piece> promotedPiece(Color color, char promotion) {
  switch (std::tolower(static_cast<unsigned char>(promotion))) {
    case 'r': return std::make_unique<Rook>(color);
    case 'b': return std::make_unique<Bishop>(color);
    case 'n': return std::make_unique<Knight>(color);
    case 'q':
    default: return std::make_unique<Queen>(color);
  }
}

bool hasOnlyKingsAndMinor(const Board& board) {
  int bishopsOrKnights = 0;
  for (Position square : board.occupiedSquares()) {
    const Piece* piece = board.pieceAt(square);
    if (!piece) continue;
    switch (piece->type()) {
      case PieceType::King:
        break;
      case PieceType::Bishop:
      case PieceType::Knight:
        bishopsOrKnights += 1;
        break;
      default:
        return false;
    }
  }
  return bishopsOrKnights <= 1;
}

}

std::vector<Move> MoveGenerator::legalMoves(const Board& board, const MoveGenerationState& state) {
  std::vector<Move> legal;
  for (Move move : pseudoLegalMoves(board, state)) {
    if (!leavesKingInCheck(board, state, move)) legal.push_back(move);
  }
  return legal;
}

std::vector<Move> MoveGenerator::legalMovesFrom(const Board& board, const MoveGenerationState& state, const std::string& square) {
  auto from = Position::fromSquare(square);
  if (!from) return {};
  std::vector<Move> filtered;
  for (const Move& move : legalMoves(board, state)) {
    if (move.from == *from) filtered.push_back(move);
  }
  return filtered;
}

std::vector<Move> MoveGenerator::pseudoLegalMoves(const Board& board, const MoveGenerationState& state) {
  std::vector<Move> moves;
  for (Position from : board.occupiedSquares()) {
    const Piece* piece = board.pieceAt(from);
    if (!piece || piece->color() != state.turn) continue;
    auto pieceMoves = piece->getPseudoLegalMoves(board, from);
    for (Move& move : pieceMoves) {
      move.movingPiece = static_cast<char>(std::tolower(piece->symbol()));
      moves.push_back(move);
    }
  }
  addEnPassantMoves(board, state, moves);
  addCastlingMoves(board, state, moves);
  return moves;
}

void MoveGenerator::addEnPassantMoves(const Board& board, const MoveGenerationState& state, std::vector<Move>& moves) {
  if (state.enPassant == "-") return;
  auto target = Position::fromSquare(state.enPassant);
  if (!target) return;
  const int pawnRank = state.turn == Color::White ? target->rank - 1 : target->rank + 1;
  for (int df : {-1, 1}) {
    Position from{target->file + df, pawnRank};
    if (!from.isValid()) continue;
    const Piece* pawn = board.pieceAt(from);
    if (!pawn || pawn->color() != state.turn || pawn->type() != PieceType::Pawn) continue;
    Move move{from, *target};
    move.capture = true;
    move.enPassant = true;
    move.movingPiece = 'p';
    move.capturedPiece = state.turn == Color::White ? 'p' : 'P';
    moves.push_back(move);
  }
}

void MoveGenerator::addCastlingMoves(const Board& board, const MoveGenerationState& state, std::vector<Move>& moves) {
  const int index = colorIndex(state.turn);
  const Position kingStart = state.kingStart[index];
  const Piece* king = board.pieceAt(kingStart);
  if (!king || king->color() != state.turn || king->type() != PieceType::King) return;
  if (isInCheck(board, state.turn)) return;

  struct Side {
    bool allowed;
    bool kingSide;
    Position rookStart;
    Position kingFinal;
    Position rookFinal;
  };

  const int rank = state.turn == Color::White ? 0 : 7;
  const bool canKingSide = state.turn == Color::White ? state.castling.whiteKingSide : state.castling.blackKingSide;
  const bool canQueenSide = state.turn == Color::White ? state.castling.whiteQueenSide : state.castling.blackQueenSide;
  const Side sides[] = {
    {canKingSide, true, state.rookKingSideStart[index], Position{6, rank}, Position{5, rank}},
    {canQueenSide, false, state.rookQueenSideStart[index], Position{2, rank}, Position{3, rank}},
  };

  for (const Side& side : sides) {
    if (!side.allowed) continue;
    const Piece* rook = board.pieceAt(side.rookStart);
    if (!rook || rook->color() != state.turn || rook->type() != PieceType::Rook) continue;
    std::vector<Position> required = betweenInclusive(kingStart, side.rookStart);
    auto kingPath = betweenInclusive(kingStart, side.kingFinal);
    required.insert(required.end(), kingPath.begin(), kingPath.end());
    required.push_back(side.rookFinal);
    if (!clearSquaresForCastle(board, required, kingStart, side.rookStart)) continue;
    bool attacked = false;
    for (Position square : kingPath) {
      if (square == kingStart) continue;
      Board copy = board;
      if (side.rookStart == square) copy.removePiece(side.rookStart);
      if (isSquareAttacked(copy, square, opposite(state.turn))) {
        attacked = true;
        break;
      }
    }
    if (attacked) continue;
    Move move{kingStart, side.kingFinal};
    move.castling = true;
    move.castleKingSide = side.kingSide;
    move.movingPiece = 'k';
    moves.push_back(move);
  }
}

bool MoveGenerator::leavesKingInCheck(const Board& board, const MoveGenerationState& state, const Move& move) {
  Board copy = board;
  applyMoveToBoard(copy, move);
  return isInCheck(copy, state.turn);
}

void MoveGenerator::applyMoveToBoard(Board& board, const Move& move) {
  const Piece* moving = board.pieceAt(move.from);
  if (!moving) return;
  const Color color = moving->color();
  if (move.castling) {
    const int rank = color == Color::White ? 0 : 7;
    Position rookFrom = move.castleKingSide ? Position{7, rank} : Position{0, rank};
    if (!board.pieceAt(rookFrom) || board.pieceAt(rookFrom)->type() != PieceType::Rook) {
      for (Position square : board.occupiedSquares()) {
        const Piece* candidate = board.pieceAt(square);
        if (candidate && candidate->color() == color && candidate->type() == PieceType::Rook) {
          if (move.castleKingSide && square.file > move.from.file) rookFrom = square;
          if (!move.castleKingSide && square.file < move.from.file) rookFrom = square;
        }
      }
    }
    Position rookTo = move.castleKingSide ? Position{5, rank} : Position{3, rank};
    board.removePiece(move.to);
    board.removePiece(rookTo);
    board.movePiece(move.from, move.to);
    board.movePiece(rookFrom, rookTo);
    return;
  }
  if (move.enPassant) {
    Position captured{move.to.file, move.from.rank};
    board.removePiece(captured);
  }
  if (move.promotion != '\0') {
    board.removePiece(move.to);
    board.removePiece(move.from);
    board.setPiece(move.to, promotedPiece(color, move.promotion));
    return;
  }
  board.movePiece(move.from, move.to);
}

bool MoveGenerator::isSquareAttacked(const Board& board, Position square, Color byColor) {
  for (Position from : board.occupiedSquares()) {
    const Piece* piece = board.pieceAt(from);
    if (!piece || piece->color() != byColor) continue;
    if (piece->type() == PieceType::Pawn) {
      const int direction = byColor == Color::White ? 1 : -1;
      if (square.rank - from.rank == direction && std::abs(square.file - from.file) == 1) return true;
      continue;
    }
    for (const Move& move : piece->getPseudoLegalMoves(board, from)) {
      if (move.to == square) return true;
    }
  }
  return false;
}

bool MoveGenerator::isInCheck(const Board& board, Color color) {
  auto king = board.findKing(color);
  if (!king) return false;
  return isSquareAttacked(board, *king, opposite(color));
}

bool MoveGenerator::isInsufficientMaterial(const Board& board) {
  return hasOnlyKingsAndMinor(board);
}

}
