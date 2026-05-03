#include "chesstrix/Queen.hpp"

namespace chesstrix {

Queen::Queen(Color color) : Piece(color) {}
PieceType Queen::type() const { return PieceType::Queen; }
char Queen::symbol() const { return color() == Color::White ? 'Q' : 'q'; }
std::unique_ptr<Piece> Queen::clone() const { return std::make_unique<Queen>(*this); }

std::vector<Move> Queen::getPseudoLegalMoves(const Board& board, Position from) const {
  std::vector<Move> moves;
  addSlidingMoves(board, from, {{1, 0}, {-1, 0}, {0, 1}, {0, -1}, {1, 1}, {-1, 1}, {1, -1}, {-1, -1}}, moves);
  return moves;
}

}
