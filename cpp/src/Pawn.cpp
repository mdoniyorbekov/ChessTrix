#include "chesstrix/Pawn.hpp"
#include "chesstrix/Board.hpp"

namespace chesstrix {

Pawn::Pawn(Color color) : Piece(color) {}
PieceType Pawn::type() const { return PieceType::Pawn; }
char Pawn::symbol() const { return color() == Color::White ? 'P' : 'p'; }
std::unique_ptr<Piece> Pawn::clone() const { return std::make_unique<Pawn>(*this); }

std::vector<Move> Pawn::getPseudoLegalMoves(const Board& board, Position from) const {
  std::vector<Move> moves;
  const int direction = color() == Color::White ? 1 : -1;
  const int startRank = color() == Color::White ? 1 : 6;
  const int promotionRank = color() == Color::White ? 7 : 0;
  Position one{from.file, from.rank + direction};
  if (one.isValid() && board.isEmpty(one)) {
    if (one.rank == promotionRank) {
      for (char promotion : {'q', 'r', 'b', 'n'}) {
        Move move{from, one};
        move.promotion = promotion;
        moves.push_back(move);
      }
    } else {
      moves.push_back(Move{from, one});
      Position two{from.file, from.rank + direction * 2};
      if (from.rank == startRank && two.isValid() && board.isEmpty(two)) moves.push_back(Move{from, two});
    }
  }

  for (int df : {-1, 1}) {
    Position to{from.file + df, from.rank + direction};
    if (!to.isValid()) continue;
    const Piece* target = board.pieceAt(to);
    if (target && target->color() != color()) {
      if (to.rank == promotionRank) {
        for (char promotion : {'q', 'r', 'b', 'n'}) {
          Move move{from, to};
          move.capture = true;
          move.capturedPiece = target->symbol();
          move.promotion = promotion;
          moves.push_back(move);
        }
      } else {
        Move move{from, to};
        move.capture = true;
        move.capturedPiece = target->symbol();
        moves.push_back(move);
      }
    }
  }
  return moves;
}

}
