#pragma once

#include <memory>
#include <string>
#include <vector>
#include "chesstrix/Move.hpp"

namespace chesstrix {

class Board;

class Piece {
public:
  explicit Piece(Color color);
  virtual ~Piece() = default;

  Color color() const;
  virtual PieceType type() const = 0;
  virtual char symbol() const = 0;
  virtual std::vector<Move> getPseudoLegalMoves(const Board& board, Position from) const = 0;
  virtual std::unique_ptr<Piece> clone() const = 0;

protected:
  void addSlidingMoves(const Board& board, Position from, const std::vector<std::pair<int, int>>& directions, std::vector<Move>& moves) const;

private:
  Color color_;
};

}
