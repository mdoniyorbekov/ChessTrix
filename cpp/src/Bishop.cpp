#include "chesstrix/Bishop.hpp"

namespace chesstrix {

Bishop::Bishop(Color color) : Piece(color) {}
PieceType Bishop::type() const { return PieceType::Bishop; }
char Bishop::symbol() const { return color() == Color::White ? 'B' : 'b'; }
std::unique_ptr<Piece> Bishop::clone() const { return std::make_unique<Bishop>(*this); }

std::vector<Move> Bishop::getPseudoLegalMoves(const Board& board, Position from) const {
  std::vector<Move> moves;
  addSlidingMoves(board, from, {{1, 1}, {-1, 1}, {1, -1}, {-1, -1}}, moves);
  return moves;
}

}
