#pragma once

#include <array>
#include <string>
#include <vector>
#include "chesstrix/Board.hpp"

namespace chesstrix {

struct CastlingRights {
  bool whiteKingSide = true;
  bool whiteQueenSide = true;
  bool blackKingSide = true;
  bool blackQueenSide = true;
};

struct MoveGenerationState {
  Color turn = Color::White;
  CastlingRights castling;
  std::string enPassant = "-";
  bool chess960 = false;
  std::array<Position, 2> kingStart{Position{4, 0}, Position{4, 7}};
  std::array<Position, 2> rookKingSideStart{Position{7, 0}, Position{7, 7}};
  std::array<Position, 2> rookQueenSideStart{Position{0, 0}, Position{0, 7}};
};

class MoveGenerator {
public:
  static std::vector<Move> legalMoves(const Board& board, const MoveGenerationState& state);
  static std::vector<Move> legalMovesFrom(const Board& board, const MoveGenerationState& state, const std::string& square);
  static bool isSquareAttacked(const Board& board, Position square, Color byColor);
  static bool isInCheck(const Board& board, Color color);
  static bool isInsufficientMaterial(const Board& board);

private:
  static std::vector<Move> pseudoLegalMoves(const Board& board, const MoveGenerationState& state);
  static void addEnPassantMoves(const Board& board, const MoveGenerationState& state, std::vector<Move>& moves);
  static void addCastlingMoves(const Board& board, const MoveGenerationState& state, std::vector<Move>& moves);
  static bool leavesKingInCheck(const Board& board, const MoveGenerationState& state, const Move& move);
  static void applyMoveToBoard(Board& board, const Move& move);
};

}
