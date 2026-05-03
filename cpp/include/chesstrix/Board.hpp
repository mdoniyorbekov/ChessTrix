#pragma once

#include <array>
#include <memory>
#include <string>
#include <vector>
#include "chesstrix/Piece.hpp"

namespace chesstrix {

class Board {
public:
  Board();
  Board(const Board& other);
  Board& operator=(const Board& other);
  Board(Board&&) noexcept = default;
  Board& operator=(Board&&) noexcept = default;

  void clear();
  const Piece* pieceAt(Position position) const;
  Piece* pieceAt(Position position);
  void setPiece(Position position, std::unique_ptr<Piece> piece);
  std::unique_ptr<Piece> removePiece(Position position);
  void movePiece(Position from, Position to);
  bool isEmpty(Position position) const;
  bool isEnemy(Position position, Color color) const;
  std::optional<Position> findKing(Color color) const;
  std::vector<Position> occupiedSquares() const;
  std::string toJson() const;

private:
  std::array<std::unique_ptr<Piece>, 64> squares_;
};

}
