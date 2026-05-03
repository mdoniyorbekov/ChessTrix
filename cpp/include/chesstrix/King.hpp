#pragma once

#include "chesstrix/Piece.hpp"

namespace chesstrix {

class King final : public Piece {
public:
  explicit King(Color color);
  PieceType type() const override;
  char symbol() const override;
  std::vector<Move> getPseudoLegalMoves(const Board& board, Position from) const override;
  std::unique_ptr<Piece> clone() const override;
};

}
