#pragma once

#include <string>
#include "chesstrix/Position.hpp"

namespace chesstrix {

struct Move {
  Position from;
  Position to;
  char promotion = '\0';
  bool capture = false;
  bool enPassant = false;
  bool castling = false;
  bool castleKingSide = false;
  char movingPiece = '\0';
  char capturedPiece = '\0';
  std::string san;

  std::string uci() const {
    std::string value = from.square() + to.square();
    if (promotion != '\0') value.push_back(static_cast<char>(std::tolower(promotion)));
    return value;
  }
};

}
