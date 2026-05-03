#pragma once

#include <string>
#include "chesstrix/Board.hpp"

namespace chesstrix {

struct FenState {
  Color turn = Color::White;
  std::string castling = "KQkq";
  std::string enPassant = "-";
  int halfmove = 0;
  int fullmove = 1;
};

class Fen {
public:
  static bool load(const std::string& fen, Board& board, FenState& state, std::string& error);
  static std::string generate(const Board& board, const FenState& state);
  static std::unique_ptr<Piece> pieceFromSymbol(char symbol);
};

}
