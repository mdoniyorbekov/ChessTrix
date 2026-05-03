#include "chesstrix/Game.hpp"
#include "chesstrix/GameAnalyzer.hpp"
#include <cstdlib>
#include <iostream>
#include <string>

namespace {

int failures = 0;

void expect(bool condition, const std::string& name) {
  if (condition) {
    std::cout << "[PASS] " << name << "\n";
    return;
  }
  std::cerr << "[FAIL] " << name << "\n";
  failures += 1;
}

bool contains(const std::string& text, const std::string& needle) {
  return text.find(needle) != std::string::npos;
}

}

int main() {
  using chesstrix::Game;
  using chesstrix::GameAnalyzer;

  Game game;
  expect(game.legalMoves().size() == 20, "initial legal moves = 20");
  expect(game.makeMove("e2", "e4"), "e2e4 works");
  expect(contains(game.getFen(), " b "), "turn handling after e2e4");
  expect(!game.makeMove("e2", "e5"), "illegal moves rejected");

  game.reset();
  const std::string startFen = game.getFen();
  game.makeMove("g1", "f3");
  expect(game.undo() && game.getFen() == startFen, "undo works");
  game.makeMove("e2", "e4");
  game.makeMove("e7", "e5");
  expect(contains(game.getMoveHistoryJson(), "e2e4") && contains(game.getMoveHistoryJson(), "e7e5"), "move history works");

  expect(game.loadFen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1"), "FEN load works");
  expect(game.makeMove("e1", "g1"), "castling works");
  expect(game.getFen().find("R4RK1 b kq - 1 1") != std::string::npos, "FEN export after castling works");

  game.loadFen("8/8/8/3pP3/8/8/8/k6K w - d6 0 1");
  expect(game.makeMove("e5", "d6"), "en passant works");
  expect(game.getFen().find("3P4") != std::string::npos, "en passant captured pawn removed");

  game.loadFen("8/P7/8/8/8/8/8/k6K w - - 0 1");
  expect(game.makeMove("a7", "a8", 'q'), "promotion works");
  expect(game.getFen().find("Q7") == 0, "promotion creates queen");

  game.loadFen("4k3/8/8/8/8/8/4Q3/4K3 b - - 0 1");
  expect(game.isCheck(), "check detection works");

  game.reset();
  game.makeMove("f2", "f3");
  game.makeMove("e7", "e5");
  game.makeMove("g2", "g4");
  game.makeMove("d8", "h4");
  expect(game.isCheckmate(), "checkmate detection works");

  game.loadFen("7k/5K2/6Q1/8/8/8/8/8 b - - 0 1");
  expect(game.isStalemate(), "stalemate detection works");

  Game chess960("chess960");
  chess960.loadFen("8/8/8/8/8/8/8/RK5R w KQ - 0 1");
  expect(chess960.makeMove("b1", "g1"), "Chess960 castling works");
  expect(chess960.getFen().find("R4RK1 b - - 1 1") != std::string::npos, "Chess960 castling final squares");

  expect(GameAnalyzer::classifyMove(260) == "Blunder", "move classification works");
  expect(GameAnalyzer::accuracyFromCentipawnLoss(0) == 100.0, "analysis accuracy calculation works");

  return failures == 0 ? EXIT_SUCCESS : EXIT_FAILURE;
}
