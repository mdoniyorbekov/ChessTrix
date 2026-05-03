#include "chesstrix/Fen.hpp"
#include "chesstrix/Bishop.hpp"
#include "chesstrix/King.hpp"
#include "chesstrix/Knight.hpp"
#include "chesstrix/Pawn.hpp"
#include "chesstrix/Queen.hpp"
#include "chesstrix/Rook.hpp"
#include <cctype>
#include <sstream>

namespace chesstrix {

std::unique_ptr<Piece> Fen::pieceFromSymbol(char symbol) {
  const Color color = std::isupper(static_cast<unsigned char>(symbol)) ? Color::White : Color::Black;
  switch (std::tolower(static_cast<unsigned char>(symbol))) {
    case 'k': return std::make_unique<King>(color);
    case 'q': return std::make_unique<Queen>(color);
    case 'r': return std::make_unique<Rook>(color);
    case 'b': return std::make_unique<Bishop>(color);
    case 'n': return std::make_unique<Knight>(color);
    case 'p': return std::make_unique<Pawn>(color);
    default: return nullptr;
  }
}

bool Fen::load(const std::string& fen, Board& board, FenState& state, std::string& error) {
  std::istringstream input(fen.empty() ? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" : fen);
  std::string boardText;
  std::string turnText;
  if (!(input >> boardText >> turnText >> state.castling >> state.enPassant >> state.halfmove >> state.fullmove)) {
    error = "Invalid FEN: expected six fields.";
    return false;
  }

  Board next;
  std::istringstream ranks(boardText);
  std::string rankText;
  int rank = 7;
  while (std::getline(ranks, rankText, '/')) {
    if (rank < 0) {
      error = "Invalid FEN: too many ranks.";
      return false;
    }
    int file = 0;
    for (char symbol : rankText) {
      if (std::isdigit(static_cast<unsigned char>(symbol))) {
        file += symbol - '0';
        continue;
      }
      auto piece = pieceFromSymbol(symbol);
      if (!piece || file >= 8) {
        error = "Invalid FEN: invalid board contents.";
        return false;
      }
      next.setPiece(Position{file, rank}, std::move(piece));
      file += 1;
    }
    if (file != 8) {
      error = "Invalid FEN: rank does not contain eight squares.";
      return false;
    }
    rank -= 1;
  }
  if (rank != -1) {
    error = "Invalid FEN: not enough ranks.";
    return false;
  }

  if (turnText != "w" && turnText != "b") {
    error = "Invalid FEN: active color must be w or b.";
    return false;
  }
  state.turn = turnText == "w" ? Color::White : Color::Black;
  if (state.castling.empty()) state.castling = "-";
  if (state.enPassant.empty()) state.enPassant = "-";
  board = std::move(next);
  return true;
}

std::string Fen::generate(const Board& board, const FenState& state) {
  std::ostringstream output;
  for (int rank = 7; rank >= 0; --rank) {
    if (rank != 7) output << "/";
    int empty = 0;
    for (int file = 0; file < 8; ++file) {
      const Piece* piece = board.pieceAt(Position{file, rank});
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty) {
        output << empty;
        empty = 0;
      }
      output << piece->symbol();
    }
    if (empty) output << empty;
  }
  output << " " << colorCode(state.turn)
         << " " << (state.castling.empty() ? "-" : state.castling)
         << " " << (state.enPassant.empty() ? "-" : state.enPassant)
         << " " << state.halfmove
         << " " << state.fullmove;
  return output.str();
}

}
