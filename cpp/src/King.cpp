#include "chesstrix/King.hpp"
#include "chesstrix/Board.hpp"

namespace chesstrix {

King::King(Color color) : Piece(color) {}
PieceType King::type() const { return PieceType::King; }
char King::symbol() const { return color() == Color::White ? 'K' : 'k'; }
std::unique_ptr<Piece> King::clone() const { return std::make_unique<King>(*this); }

std::vector<Move> King::getPseudoLegalMoves(const Board& board, Position from) const {
  std::vector<Move> moves;
  for (int df = -1; df <= 1; ++df) {
    for (int dr = -1; dr <= 1; ++dr) {
      if (df == 0 && dr == 0) continue;
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
  }
  return moves;
}

}
