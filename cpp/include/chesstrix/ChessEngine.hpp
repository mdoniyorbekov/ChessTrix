#pragma once

#include <string>

namespace chesstrix {

class ChessEngine {
public:
  virtual ~ChessEngine() = default;
  virtual std::string bestMove(const std::string& fen) = 0;
};

}
