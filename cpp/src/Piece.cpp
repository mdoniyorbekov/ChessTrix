#include "chesstrix/Piece.hpp"
#include "chesstrix/Board.hpp"

namespace chesstrix {

Piece::Piece(Color color) : color_(color) {}

Color Piece::color() const {
  return color_;
}

void Piece::addSlidingMoves(const Board& board, Position from, const std::vector<std::pair<int, int>>& directions, std::vector<Move>& moves) const {
  for (const auto& [df, dr] : directions) {
    Position to{from.file + df, from.rank + dr};
    while (to.isValid()) {
      if (board.isEmpty(to)) {
        moves.push_back(Move{from, to});
      } else {
        if (board.isEnemy(to, color())) {
          Move move{from, to};
          move.capture = true;
          move.capturedPiece = board.pieceAt(to)->symbol();
          moves.push_back(move);
        }
        break;
      }
      to.file += df;
      to.rank += dr;
    }
  }
}

}
