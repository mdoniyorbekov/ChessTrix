#pragma once

#include <optional>
#include <string>
#include <vector>
#include "chesstrix/Fen.hpp"
#include "chesstrix/MoveGenerator.hpp"

namespace chesstrix {

struct MoveRecord {
  Move move;
  std::string beforeFen;
  std::string afterFen;
};

class Game {
public:
  explicit Game(std::string variant = "standard");

  void reset();
  bool loadFen(const std::string& fen);
  std::string getFen() const;
  std::string getBoardJson() const;
  std::vector<Move> legalMoves(const std::string& square = "") const;
  std::string legalMovesJson(const std::string& square = "") const;
  bool makeMove(const std::string& from, const std::string& to, char promotion = '\0');
  bool undo();
  Color getTurn() const;
  std::string getGameStatus() const;
  std::string getMoveHistoryJson() const;
  std::string getCapturedPiecesJson() const;
  std::string getCastlingRights() const;
  bool isCheck() const;
  bool isCheckmate() const;
  bool isStalemate() const;
  bool isDraw() const;
  const std::vector<MoveRecord>& history() const;

private:
  struct Snapshot {
    Board board;
    FenState fenState;
    CastlingRights castling;
    std::vector<MoveRecord> history;
    std::vector<char> whiteCaptured;
    std::vector<char> blackCaptured;
  };

  Board board_;
  FenState fenState_;
  CastlingRights castling_;
  std::string variant_;
  std::string initialFen_;
  std::vector<MoveRecord> history_;
  std::vector<Snapshot> undoStack_;
  std::vector<char> whiteCaptured_;
  std::vector<char> blackCaptured_;
  std::array<Position, 2> kingStart_;
  std::array<Position, 2> rookKingSideStart_;
  std::array<Position, 2> rookQueenSideStart_;

  MoveGenerationState generationState() const;
  void updateCastlingRights(const Move& move);
  void refreshCastlingFromFen();
  void captureInitialCastlingSquares();
  void applyMove(const Move& move);
  std::string sanForMove(const Move& move) const;
};

}
