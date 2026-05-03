#include "chesstrix/Knight.hpp"
#include "chesstrix/Board.hpp"

namespace chesstrix {

Knight::Knight(Color color) : Piece(color) {}
PieceType Knight::type() const { return PieceType::Knight; }
char Knight::symbol() const { return color() == Color::White ? 'N' : 'n'; }
std::unique_ptr<Piece> Knight::clone() const { return std::make_unique<Knight>(*this); }

std::vector<Move> Knight::getPseudoLegalMoves(const Board& board, Position from) const {
  std::vector<Move> moves;
  const std::pair<int, int> jumps[] = {{1, 2}, {2, 1}, {-1, 2}, {-2, 1}, {1, -2}, {2, -1}, {-1, -2}, {-2, -1}};
  for (const auto& [df, dr] : jumps) {
    Position to{from.file + df, from.rank + dr};
    if (!to.isValid()) continue;
    const Piece* target = board.pieceAt(to);
    if (!target || target->color() != color()) {
      Move move{from, to};
      if (target) {
        move.capture = true;
        move.capturedPiece = target->symbol();
      }
      moves.push_back(move);
    }
  }
  return moves;
}

}
