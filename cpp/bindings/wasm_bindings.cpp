#include "chesstrix/Game.hpp"
#include "chesstrix/GameAnalyzer.hpp"
#include <memory>
#include <string>

namespace {

std::unique_ptr<chesstrix::Game> game;
std::string result;

const char* hold(std::string value) {
  result = std::move(value);
  return result.c_str();
}

chesstrix::Game& currentGame() {
  if (!game) game = std::make_unique<chesstrix::Game>("standard");
  return *game;
}

}

extern "C" {

const char* createGame(const char* variant) {
  game = std::make_unique<chesstrix::Game>(variant ? variant : "standard");
  return hold("{\"ok\":true}");
}

const char* loadFen(const char* fen) {
  const bool ok = currentGame().loadFen(fen ? fen : "");
  return hold(ok ? "{\"ok\":true}" : "{\"ok\":false,\"error\":\"Invalid FEN\"}");
}

const char* reset() {
  currentGame().reset();
  return hold("{\"ok\":true}");
}

const char* getFen() {
  return hold(currentGame().getFen());
}

const char* getBoardJson() {
  return hold(currentGame().getBoardJson());
}

const char* getLegalMoves(const char* square) {
  return hold(currentGame().legalMovesJson(square ? square : ""));
}

const char* makeMove(const char* from, const char* to, const char* promotion) {
  const char promote = promotion && promotion[0] ? promotion[0] : '\0';
  const bool ok = currentGame().makeMove(from ? from : "", to ? to : "", promote);
  return hold(ok ? "{\"ok\":true}" : "{\"ok\":false,\"error\":\"Illegal move\"}");
}

const char* undo() {
  const bool ok = currentGame().undo();
  return hold(ok ? "{\"ok\":true}" : "{\"ok\":false}");
}

const char* getTurn() {
  return hold(std::string(1, chesstrix::colorCode(currentGame().getTurn())));
}

const char* getGameStatus() {
  return hold(currentGame().getGameStatus());
}

const char* getMoveHistory() {
  return hold(currentGame().getMoveHistoryJson());
}

const char* getCapturedPieces() {
  return hold(currentGame().getCapturedPiecesJson());
}

const char* getCastlingRights() {
  return hold(currentGame().getCastlingRights());
}

const char* analyzeMove(double evalBefore, double evalAfter, const char* sideToMove) {
  return hold(chesstrix::GameAnalyzer::analyzeMove(evalBefore, evalAfter, sideToMove && sideToMove[0] ? sideToMove[0] : 'w'));
}

const char* classifyMove(double centipawnLoss) {
  return hold(chesstrix::GameAnalyzer::classifyMove(centipawnLoss));
}

}
