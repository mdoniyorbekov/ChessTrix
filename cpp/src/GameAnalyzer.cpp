#include "chesstrix/GameAnalyzer.hpp"
#include <algorithm>
#include <cmath>
#include <sstream>

namespace chesstrix {

double GameAnalyzer::accuracyFromCentipawnLoss(double centipawnLoss) {
  if (!std::isfinite(centipawnLoss)) return 0.0;
  const double value = 100.0 * std::exp(-std::max(0.0, centipawnLoss) / 180.0);
  return std::clamp(value, 0.0, 100.0);
}

std::string GameAnalyzer::classifyMove(double centipawnLoss) {
  if (centipawnLoss <= 10) return "Best";
  if (centipawnLoss <= 25) return "Excellent";
  if (centipawnLoss <= 50) return "Good";
  if (centipawnLoss <= 100) return "Inaccuracy";
  if (centipawnLoss <= 250) return "Mistake";
  return "Blunder";
}

std::string GameAnalyzer::analyzeMove(double evalBefore, double evalAfter, char sideToMove) {
  const double multiplier = sideToMove == 'b' ? -1.0 : 1.0;
  const double centipawnLoss = std::max(0.0, (evalBefore - evalAfter) * multiplier);
  std::ostringstream json;
  json << "{\"centipawnLoss\":" << centipawnLoss
       << ",\"accuracy\":" << accuracyFromCentipawnLoss(centipawnLoss)
       << ",\"classification\":\"" << classifyMove(centipawnLoss) << "\"}";
  return json.str();
}

}
