#include "chesstrix/Board.hpp"
#include <cctype>
#include <sstream>

namespace chesstrix {

Board::Board() = default;

Board::Board(const Board& other) {
  *this = other;
}

Board& Board::operator=(const Board& other) {
  if (this == &other) return *this;
  clear();
  for (std::size_t index = 0; index < squares_.size(); ++index) {
    if (other.squares_[index]) squares_[index] = other.squares_[index]->clone();
  }
  return *this;
}

void Board::clear() {
  for (auto& square : squares_) square.reset();
}

const Piece* Board::pieceAt(Position position) const {
  if (!position.isValid()) return nullptr;
  return squares_[position.index()].get();
}

Piece* Board::pieceAt(Position position) {
  if (!position.isValid()) return nullptr;
  return squares_[position.index()].get();
}

void Board::setPiece(Position position, std::unique_ptr<Piece> piece) {
  if (!position.isValid()) return;
  squares_[position.index()] = std::move(piece);
}

std::unique_ptr<Piece> Board::removePiece(Position position) {
  if (!position.isValid()) return nullptr;
  auto piece = std::move(squares_[position.index()]);
  squares_[position.index()].reset();
  return piece;
}

void Board::movePiece(Position from, Position to) {
  if (!from.isValid() || !to.isValid()) return;
  squares_[to.index()] = std::move(squares_[from.index()]);
  squares_[from.index()].reset();
}

bool Board::isEmpty(Position position) const {
  return position.isValid() && !pieceAt(position);
}

bool Board::isEnemy(Position position, Color color) const {
  const Piece* piece = pieceAt(position);
  return piece && piece->color() != color;
}

std::optional<Position> Board::findKing(Color color) const {
  for (int rank = 0; rank < 8; ++rank) {
    for (int file = 0; file < 8; ++file) {
      Position position{file, rank};
      const Piece* piece = pieceAt(position);
      if (piece && piece->color() == color && piece->type() == PieceType::King) return position;
    }
  }
  return std::nullopt;
}

std::vector<Position> Board::occupiedSquares() const {
  std::vector<Position> squares;
  for (int rank = 0; rank < 8; ++rank) {
    for (int file = 0; file < 8; ++file) {
      Position position{file, rank};
      if (pieceAt(position)) squares.push_back(position);
    }
  }
  return squares;
}

std::string Board::toJson() const {
  std::ostringstream json;
  json << "[";
  for (int rankIndex = 0; rankIndex < 8; ++rankIndex) {
    if (rankIndex) json << ",";
    json << "[";
    const int rank = 7 - rankIndex;
    for (int file = 0; file < 8; ++file) {
      if (file) json << ",";
      Position position{file, rank};
      const Piece* piece = pieceAt(position);
      if (!piece) {
        json << "null";
      } else {
        json << "{\"square\":\"" << position.square() << "\",\"type\":\"" << static_cast<char>(std::tolower(piece->symbol()))
             << "\",\"color\":\"" << colorCode(piece->color()) << "\"}";
      }
    }
    json << "]";
  }
  json << "]";
  return json.str();
}

}
