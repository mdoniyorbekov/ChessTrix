#include "chesstrix/Game.hpp"
#include "chesstrix/Bishop.hpp"
#include "chesstrix/King.hpp"
#include "chesstrix/Knight.hpp"
#include "chesstrix/Pawn.hpp"
#include "chesstrix/Queen.hpp"
#include "chesstrix/Rook.hpp"
#include <algorithm>
#include <cctype>
#include <sstream>

namespace chesstrix {

namespace {

constexpr const char* standardFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

int colorIndex(Color color) {
  return color == Color::White ? 0 : 1;
}

std::string escapeJson(const std::string& value) {
  std::string escaped;
  for (char ch : value) {
    if (ch == '"' || ch == '\\') escaped.push_back('\\');
    escaped.push_back(ch);
  }
  return escaped;
}

std::unique_ptr<Piece> promotedPiece(Color color, char promotion) {
  switch (std::tolower(static_cast<unsigned char>(promotion))) {
    case 'r': return std::make_unique<Rook>(color);
    case 'b': return std::make_unique<Bishop>(color);
    case 'n': return std::make_unique<Knight>(color);
    case 'q':
    default: return std::make_unique<Queen>(color);
  }
}

std::string pieceName(char symbol) {
  switch (std::tolower(static_cast<unsigned char>(symbol))) {
    case 'k': return "k";
    case 'q': return "q";
    case 'r': return "r";
    case 'b': return "b";
    case 'n': return "n";
    case 'p': return "p";
    default: return "";
  }
}

std::string castlingRightsToFen(const CastlingRights& rights) {
  std::string value;
  if (rights.whiteKingSide) value += "K";
  if (rights.whiteQueenSide) value += "Q";
  if (rights.blackKingSide) value += "k";
  if (rights.blackQueenSide) value += "q";
  return value.empty() ? "-" : value;
}

}

Game::Game(std::string variant) : variant_(std::move(variant)) {
  kingStart_ = {Position{4, 0}, Position{4, 7}};
  rookKingSideStart_ = {Position{7, 0}, Position{7, 7}};
  rookQueenSideStart_ = {Position{0, 0}, Position{0, 7}};
  reset();
}

void Game::reset() {
  loadFen(standardFen);
  history_.clear();
  undoStack_.clear();
  whiteCaptured_.clear();
  blackCaptured_.clear();
}

bool Game::loadFen(const std::string& fen) {
  std::string error;
  const std::string nextFen = fen.empty() ? standardFen : fen;
  if (!Fen::load(nextFen, board_, fenState_, error)) return false;
  initialFen_ = nextFen;
  refreshCastlingFromFen();
  captureInitialCastlingSquares();
  history_.clear();
  undoStack_.clear();
  whiteCaptured_.clear();
  blackCaptured_.clear();
  return true;
}

std::string Game::getFen() const {
  FenState state = fenState_;
  state.castling = castlingRightsToFen(castling_);
  return Fen::generate(board_, state);
}

std::string Game::getBoardJson() const {
  return board_.toJson();
}

MoveGenerationState Game::generationState() const {
  MoveGenerationState state;
  state.turn = fenState_.turn;
  state.castling = castling_;
  state.enPassant = fenState_.enPassant;
  state.chess960 = variant_ == "chess960";
  state.kingStart = kingStart_;
  state.rookKingSideStart = rookKingSideStart_;
  state.rookQueenSideStart = rookQueenSideStart_;
  return state;
}

std::vector<Move> Game::legalMoves(const std::string& square) const {
  if (square.empty()) return MoveGenerator::legalMoves(board_, generationState());
  return MoveGenerator::legalMovesFrom(board_, generationState(), square);
}

std::string Game::legalMovesJson(const std::string& square) const {
  std::ostringstream json;
  json << "[";
  const auto moves = legalMoves(square);
  for (std::size_t index = 0; index < moves.size(); ++index) {
    const Move& move = moves[index];
    if (index) json << ",";
    json << "{\"from\":\"" << move.from.square() << "\",\"to\":\"" << move.to.square()
         << "\",\"uci\":\"" << move.uci() << "\",\"piece\":\"" << move.movingPiece
         << "\",\"flags\":\"" << (move.castling ? (move.castleKingSide ? "k" : "q") : (move.enPassant ? "e" : (move.capture ? "c" : "n"))) << "\"";
    if (move.promotion != '\0') json << ",\"promotion\":\"" << move.promotion << "\"";
    if (move.capture) json << ",\"captured\":\"" << pieceName(move.capturedPiece) << "\"";
    json << "}";
  }
  json << "]";
  return json.str();
}

bool Game::makeMove(const std::string& fromText, const std::string& toText, char promotion) {
  auto from = Position::fromSquare(fromText);
  auto to = Position::fromSquare(toText);
  if (!from || !to) return false;

  auto moves = legalMoves(fromText);
  auto found = std::find_if(moves.begin(), moves.end(), [&](const Move& move) {
    if (move.to == *to && (move.promotion == '\0' || promotion == '\0' || std::tolower(move.promotion) == std::tolower(promotion))) return true;
    if (move.castling) {
      const int index = colorIndex(fenState_.turn);
      if (*to == (move.castleKingSide ? rookKingSideStart_[index] : rookQueenSideStart_[index])) return true;
    }
    return false;
  });
  if (found == moves.end()) return false;

  Move move = *found;
  if (promotion != '\0' && move.promotion != '\0') move.promotion = static_cast<char>(std::tolower(promotion));
  const std::string beforeFen = getFen();
  move.san = sanForMove(move);
  undoStack_.push_back(Snapshot{board_, fenState_, castling_, history_, whiteCaptured_, blackCaptured_});
  applyMove(move);
  const std::string afterFen = getFen();
  history_.push_back(MoveRecord{move, beforeFen, afterFen});
  return true;
}

bool Game::undo() {
  if (undoStack_.empty()) return false;
  Snapshot snapshot = std::move(undoStack_.back());
  undoStack_.pop_back();
  board_ = std::move(snapshot.board);
  fenState_ = snapshot.fenState;
  castling_ = snapshot.castling;
  history_ = std::move(snapshot.history);
  whiteCaptured_ = std::move(snapshot.whiteCaptured);
  blackCaptured_ = std::move(snapshot.blackCaptured);
  return true;
}

Color Game::getTurn() const {
  return fenState_.turn;
}

std::string Game::getGameStatus() const {
  if (isCheckmate()) return std::string("Checkmate. ") + (fenState_.turn == Color::White ? "Black" : "White") + " wins";
  if (isStalemate()) return "Stalemate";
  if (isDraw()) return "Draw";
  if (isCheck()) return colorName(fenState_.turn) + " is in check";
  return colorName(fenState_.turn) + " to move";
}

std::string Game::getMoveHistoryJson() const {
  std::ostringstream json;
  json << "[";
  for (std::size_t index = 0; index < history_.size(); ++index) {
    const MoveRecord& record = history_[index];
    if (index) json << ",";
    json << "{\"from\":\"" << record.move.from.square() << "\",\"to\":\"" << record.move.to.square()
         << "\",\"uci\":\"" << record.move.uci() << "\",\"san\":\"" << escapeJson(record.move.san)
         << "\",\"color\":\"" << (index % 2 == 0 ? "w" : "b") << "\",\"piece\":\"" << record.move.movingPiece
         << "\",\"before\":\"" << escapeJson(record.beforeFen) << "\",\"after\":\"" << escapeJson(record.afterFen) << "\"";
    if (record.move.capture) json << ",\"captured\":\"" << pieceName(record.move.capturedPiece) << "\"";
    if (record.move.promotion != '\0') json << ",\"promotion\":\"" << record.move.promotion << "\"";
    json << "}";
  }
  json << "]";
  return json.str();
}

std::string Game::getCapturedPiecesJson() const {
  auto write = [](std::ostringstream& json, const std::vector<char>& pieces) {
    json << "[";
    for (std::size_t index = 0; index < pieces.size(); ++index) {
      if (index) json << ",";
      json << "\"" << pieceName(pieces[index]) << "\"";
    }
    json << "]";
  };

  std::ostringstream json;
  json << "{\"white\":";
  write(json, whiteCaptured_);
  json << ",\"black\":";
  write(json, blackCaptured_);
  json << "}";
  return json.str();
}

std::string Game::getCastlingRights() const {
  return castlingRightsToFen(castling_);
}

bool Game::isCheck() const {
  return MoveGenerator::isInCheck(board_, fenState_.turn);
}

bool Game::isCheckmate() const {
  return isCheck() && legalMoves().empty();
}

bool Game::isStalemate() const {
  return !isCheck() && legalMoves().empty();
}

bool Game::isDraw() const {
  return isStalemate() || fenState_.halfmove >= 100 || MoveGenerator::isInsufficientMaterial(board_);
}

const std::vector<MoveRecord>& Game::history() const {
  return history_;
}

void Game::applyMove(const Move& move) {
  const Piece* moving = board_.pieceAt(move.from);
  if (!moving) return;
  const Color mover = moving->color();
  const bool pawnMove = moving->type() == PieceType::Pawn;
  char captured = move.capturedPiece;

  if (move.enPassant) {
    Position capturedSquare{move.to.file, move.from.rank};
    const Piece* capturedPiece = board_.pieceAt(capturedSquare);
    if (capturedPiece) captured = capturedPiece->symbol();
    board_.removePiece(capturedSquare);
  } else if (const Piece* capturedPiece = board_.pieceAt(move.to)) {
    captured = capturedPiece->symbol();
  }

  if (captured != '\0') {
    if (mover == Color::White) whiteCaptured_.push_back(captured);
    else blackCaptured_.push_back(captured);
  }

  if (move.castling) {
    const int index = colorIndex(mover);
    const int rank = mover == Color::White ? 0 : 7;
    Position rookFrom = move.castleKingSide ? rookKingSideStart_[index] : rookQueenSideStart_[index];
    Position rookTo = move.castleKingSide ? Position{5, rank} : Position{3, rank};
    board_.removePiece(move.to);
    board_.removePiece(rookTo);
    board_.movePiece(move.from, move.to);
    board_.movePiece(rookFrom, rookTo);
  } else if (move.promotion != '\0') {
    board_.removePiece(move.to);
    board_.removePiece(move.from);
    board_.setPiece(move.to, promotedPiece(mover, move.promotion));
  } else {
    board_.movePiece(move.from, move.to);
  }

  updateCastlingRights(move);
  fenState_.enPassant = "-";
  if (pawnMove && std::abs(move.to.rank - move.from.rank) == 2) {
    fenState_.enPassant = Position{move.from.file, (move.from.rank + move.to.rank) / 2}.square();
  }
  fenState_.halfmove = (pawnMove || captured != '\0') ? 0 : fenState_.halfmove + 1;
  if (mover == Color::Black) fenState_.fullmove += 1;
  fenState_.turn = opposite(fenState_.turn);
  fenState_.castling = castlingRightsToFen(castling_);
}

void Game::updateCastlingRights(const Move& move) {
  const int movingIndex = colorIndex(fenState_.turn);
  if (move.movingPiece == 'k') {
    if (fenState_.turn == Color::White) {
      castling_.whiteKingSide = false;
      castling_.whiteQueenSide = false;
    } else {
      castling_.blackKingSide = false;
      castling_.blackQueenSide = false;
    }
  }
  if (move.movingPiece == 'r') {
    if (move.from == rookKingSideStart_[movingIndex]) {
      if (fenState_.turn == Color::White) castling_.whiteKingSide = false;
      else castling_.blackKingSide = false;
    }
    if (move.from == rookQueenSideStart_[movingIndex]) {
      if (fenState_.turn == Color::White) castling_.whiteQueenSide = false;
      else castling_.blackQueenSide = false;
    }
  }
  for (Color color : {Color::White, Color::Black}) {
    const int index = colorIndex(color);
    if (move.to == rookKingSideStart_[index]) {
      if (color == Color::White) castling_.whiteKingSide = false;
      else castling_.blackKingSide = false;
    }
    if (move.to == rookQueenSideStart_[index]) {
      if (color == Color::White) castling_.whiteQueenSide = false;
      else castling_.blackQueenSide = false;
    }
  }
}

void Game::refreshCastlingFromFen() {
  const std::string rights = fenState_.castling;
  castling_.whiteKingSide = rights.find('K') != std::string::npos;
  castling_.whiteQueenSide = rights.find('Q') != std::string::npos;
  castling_.blackKingSide = rights.find('k') != std::string::npos;
  castling_.blackQueenSide = rights.find('q') != std::string::npos;
}

void Game::captureInitialCastlingSquares() {
  for (Color color : {Color::White, Color::Black}) {
    const int index = colorIndex(color);
    auto king = board_.findKing(color);
    kingStart_[index] = king.value_or(color == Color::White ? Position{4, 0} : Position{4, 7});
    rookQueenSideStart_[index] = color == Color::White ? Position{0, 0} : Position{0, 7};
    rookKingSideStart_[index] = color == Color::White ? Position{7, 0} : Position{7, 7};
    int bestQueen = -1;
    int bestKing = 8;
    for (Position square : board_.occupiedSquares()) {
      const Piece* piece = board_.pieceAt(square);
      if (!piece || piece->color() != color || piece->type() != PieceType::Rook || square.rank != kingStart_[index].rank) continue;
      if (square.file < kingStart_[index].file && square.file > bestQueen) {
        bestQueen = square.file;
        rookQueenSideStart_[index] = square;
      }
      if (square.file > kingStart_[index].file && square.file < bestKing) {
        bestKing = square.file;
        rookKingSideStart_[index] = square;
      }
    }
  }
}

std::string Game::sanForMove(const Move& move) const {
  if (move.castling) return move.castleKingSide ? "O-O" : "O-O-O";
  std::string san;
  const char piece = move.movingPiece;
  if (piece != 'p') san.push_back(static_cast<char>(std::toupper(piece == 'n' ? 'N' : piece)));
  if (move.capture) {
    if (piece == 'p') san.push_back(static_cast<char>('a' + move.from.file));
    san += "x";
  }
  san += move.to.square();
  if (move.promotion != '\0') {
    san += "=";
    san.push_back(static_cast<char>(std::toupper(move.promotion)));
  }
  return san;
}

}
