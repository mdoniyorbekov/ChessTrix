#pragma once

#include <cctype>
#include <optional>
#include <string>

namespace chesstrix {

enum class Color { White, Black };
enum class PieceType { King, Queen, Rook, Bishop, Knight, Pawn };

inline Color opposite(Color color) {
  return color == Color::White ? Color::Black : Color::White;
}

inline char colorCode(Color color) {
  return color == Color::White ? 'w' : 'b';
}

inline std::string colorName(Color color) {
  return color == Color::White ? "White" : "Black";
}

struct Position {
  int file = 0;
  int rank = 0;

  bool isValid() const {
    return file >= 0 && file < 8 && rank >= 0 && rank < 8;
  }

  int index() const {
    return rank * 8 + file;
  }

  std::string square() const {
    return std::string{static_cast<char>('a' + file), static_cast<char>('1' + rank)};
  }

  static std::optional<Position> fromSquare(const std::string& square) {
    if (square.size() != 2) return std::nullopt;
    const char fileChar = static_cast<char>(std::tolower(square[0]));
    const char rankChar = square[1];
    Position position{fileChar - 'a', rankChar - '1'};
    if (!position.isValid()) return std::nullopt;
    return position;
  }
};

inline bool operator==(const Position& left, const Position& right) {
  return left.file == right.file && left.rank == right.rank;
}

inline bool operator!=(const Position& left, const Position& right) {
  return !(left == right);
}

}
