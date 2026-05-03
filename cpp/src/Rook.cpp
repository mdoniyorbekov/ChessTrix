#include "chesstrix/Rook.hpp"

namespace chesstrix {

Rook::Rook(Color color) : Piece(color) {}
PieceType Rook::type() const { return PieceType::Rook; }
char Rook::symbol() const { return color() == Color::White ? 'R' : 'r'; }
std::unique_ptr<Piece> Rook::clone() const { return std::make_unique<Rook>(*this); }

std::vector<Move> Rook::getPseudoLegalMoves(const Board& board, Position from) const {
  std::vector<Move> moves;
  addSlidingMoves(board, from, {{1, 0}, {-1, 0}, {0, 1}, {0, -1}}, moves);
  return moves;
}

}
