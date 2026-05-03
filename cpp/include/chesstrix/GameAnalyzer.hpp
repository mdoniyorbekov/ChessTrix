#pragma once

#include <string>

namespace chesstrix {

class GameAnalyzer {
public:
  static double accuracyFromCentipawnLoss(double centipawnLoss);
  static std::string classifyMove(double centipawnLoss);
  static std::string analyzeMove(double evalBefore, double evalAfter, char sideToMove);
};

}
