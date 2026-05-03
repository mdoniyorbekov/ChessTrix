cmake_minimum_required(VERSION 3.20)

project(chesstrix_cpp_core LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(CHESSTRIX_CORE_SOURCES
  src/Board.cpp
  src/Piece.cpp
  src/King.cpp
  src/Queen.cpp
  src/Rook.cpp
  src/Bishop.cpp
  src/Knight.cpp
  src/Pawn.cpp
  src/Fen.cpp
  src/MoveGenerator.cpp
  src/Game.cpp
  src/GameAnalyzer.cpp
)

add_library(chesstrix_core STATIC ${CHESSTRIX_CORE_SOURCES})
target_include_directories(chesstrix_core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)

add_executable(chesstrix_cpp_tests tests/cpp_core_tests.cpp)
target_link_libraries(chesstrix_cpp_tests PRIVATE chesstrix_core)

if(EMSCRIPTEN)
  add_executable(chesstrix_wasm bindings/wasm_bindings.cpp)
  target_link_libraries(chesstrix_wasm PRIVATE chesstrix_core)
  target_link_options(chesstrix_wasm PRIVATE
    "-sMODULARIZE=1"
    "-sEXPORT_NAME=createChesstrixCppModule"
    "-sEXPORTED_FUNCTIONS=['_createGame','_loadFen','_reset','_getFen','_getBoardJson','_getLegalMoves','_makeMove','_undo','_getTurn','_getGameStatus','_getMoveHistory','_getCapturedPieces','_getCastlingRights','_analyzeMove','_classifyMove','_malloc','_free']"
    "-sEXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','stringToUTF8','lengthBytesUTF8']"
    "-sALLOW_MEMORY_GROWTH=1"
  )
endif()
