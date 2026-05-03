# Chesstrix

**Chess arena** is an offline desktop chess platform built for Central Asian University coursework.

## Features

- React + TypeScript + Vite renderer
- Electron desktop shell for Windows-first offline use
- Theme system with 8 replaceable visual themes in `src/theme/themes.ts`
- Normal local human vs human chess with `chess.js`
- Human vs TA bots through local Stockfish when installed
- Stockfish evaluation card and reusable evaluation bar
- Puzzle Arena with JSON puzzle data in UCI move format
- Chess960 start-position generator
- Crazyhouse local multiplayer with pockets and simplified drops
- Simplified 4-player local chess mode
- Post-game review screen skeleton using centipawn-loss categories
- Local logo, mode icons, board textures, and PNG piece sets

## Tech Stack

- React
- TypeScript
- Vite
- Electron
- chess.js
- lucide-react
- Local Stockfish executable through Electron IPC
- Plain CSS with theme CSS variables

## Install

Install Node.js first, then run:

```bash
npm install
```

## Run In Development

```bash
npm run dev
```

This starts Vite and opens the Electron desktop shell.

On Windows PowerShell, if `npm` is blocked by execution policy, use `npm.cmd` instead:

```bash
npm.cmd run dev
```

The Electron scripts launch through `scripts/run-electron.js`, which clears `ELECTRON_RUN_AS_NODE` before opening the app. This prevents Electron from accidentally starting as plain Node.js in shells where that variable is set.

## Build

```bash
npm run build
npm start
```

PowerShell alternative:

```bash
npm.cmd run build
npm.cmd start
```

Packaging is intentionally left for a later phase.

## C++ Chess Core

Chesstrix now has a C++20 chess/game core in `cpp/` while the React/Electron renderer remains responsible for UI, board display, drag/drop, menus, themes, sounds, archive/profile screens, and Stockfish IPC.

Main C++ layout:

```text
cpp/
  include/chesstrix/
    Game.hpp Board.hpp Position.hpp Move.hpp Piece.hpp
    King.hpp Queen.hpp Rook.hpp Bishop.hpp Knight.hpp Pawn.hpp
    Player.hpp ChessEngine.hpp GameAnalyzer.hpp Fen.hpp MoveGenerator.hpp
  src/
    Game.cpp Board.cpp Piece.cpp King.cpp Queen.cpp Rook.cpp Bishop.cpp Knight.cpp Pawn.cpp
    Fen.cpp MoveGenerator.cpp GameAnalyzer.cpp
  bindings/wasm_bindings.cpp
  tests/cpp_core_tests.cpp
```

The core demonstrates OOP directly:

- Encapsulation: `Board` owns its private square array, and `Game` privately owns turn, board, castling state, move history, captures, and status helpers.
- Inheritance: `Piece` is an abstract base class; `King`, `Queen`, `Rook`, `Bishop`, `Knight`, and `Pawn` inherit from it.
- Polymorphism: board/game logic stores pieces through `std::unique_ptr<Piece>` and calls virtual methods like `getPseudoLegalMoves()`, `type()`, `symbol()`, and `clone()`.
- Abstraction: TypeScript calls `CppChessController` methods such as `move()`, `moves()`, `fen()`, `history()`, and `board()` instead of editing board internals.

The C++ API exposed through `cpp/bindings/wasm_bindings.cpp` includes:

```text
createGame, loadFen, reset, getFen, getBoardJson, getLegalMoves,
makeMove, undo, getTurn, getGameStatus, getMoveHistory,
getCapturedPieces, getCastlingRights, analyzeMove, classifyMove
```

`src/game/cpp/CppChessController.ts` is the TypeScript adapter. It uses `window.chesstrixCppWasm` when the WebAssembly module has been built and loaded, and falls back to `chess.js` during development before WASM exists. Standard normal-game moves now go through this adapter; the existing React board still uses a temporary `chess.js` view object for rendering compatibility.

### C++ Build And Tests

Native build/test:

```bash
npm run build:cpp
npm run test:cpp
```

On PowerShell systems that block `npm.ps1`, use:

```bash
npm.cmd run build:cpp
npm.cmd run test:cpp
```

The C++ test suite checks initial legal moves, e2e4, illegal move rejection, castling, en passant, promotion, check, checkmate, stalemate, FEN load/export, undo, move history, Chess960 castling, move classification, and accuracy calculation.

### WebAssembly Build

Install and activate the Emscripten SDK first so `emcmake`, `em++`, and `cmake` are on PATH, then run:

```bash
npm run build:wasm
```

The script builds `cpp/bindings/wasm_bindings.cpp` and copies `chesstrix_wasm.js` plus `chesstrix_wasm.wasm` into:

```text
src/game/cpp/wasm/
```

After that, the app startup calls `installChesstrixWasm()` from `src/game/cpp/installChesstrixWasm.ts`, which installs the WASM-backed API for `CppChessController`.

Optional WASM-vs-`chess.js` comparison:

```bash
npm run test:wasm
```

This requires `npm run build:wasm` to have completed first.

## Stockfish Setup

Chesstrix never spawns Stockfish from the browser renderer. The renderer talks to Electron preload IPC, and Electron main uses `electron/stockfishService.ts` to spawn the local engine.

Engine lookup order:

1. `STOCKFISH_PATH`
2. `engines/stockfish/stockfish.exe` on Windows
3. `engines/stockfish/stockfish` on Linux/macOS

Run the helper:

```bash
npm run install-stockfish
```

If automatic download is not available, download Stockfish from <https://stockfishchess.org/download/> and place the executable in `engines/stockfish/`.

If Stockfish is missing, Chesstrix still runs and shows:

`Stockfish engine not found. Please install it or set STOCKFISH_PATH.`

## Stockfish License Note

Stockfish is an external GPL licensed chess engine. If you distribute Chesstrix with Stockfish included, follow Stockfish GPL license terms and include the required license information.

## Replace Logo

The app logo is loaded from `public/app-assets/chesstrix-logo.png`. Replace that file to update the branding everywhere.

## Replace Chess Pieces

Add SVG files to:

```text
src/assets/pieces/default/
```

Expected names:

- `white-king.svg`
- `white-queen.svg`
- `white-rook.svg`
- `white-bishop.svg`
- `white-knight.svg`
- `white-pawn.svg`
- `black-king.svg`
- `black-queen.svg`
- `black-rook.svg`
- `black-bishop.svg`
- `black-knight.svg`
- `black-pawn.svg`

If files are missing, `src/components/board/Piece.tsx` falls back to Unicode chess pieces.

## Add Puzzles

Puzzle data lives in `src/data/puzzles.json`.

Format:

```json
{
  "id": 1,
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "solution": ["e2e4", "e7e5"],
  "rating": 1200,
  "theme": "fork",
  "title": "Simple tactic"
}
```

Solutions use UCI notation: `e2e4`, `e7e8q`, etc.

## Opening Data

Game Review and Analysis use real ECO opening data generated from the MIT-licensed `@chess-openings/eco.json` package. The local runtime snapshot is stored in `src/data/openings.json`; regenerate it with:

```bash
node scripts/build-openings.js
```

## Add Themes

Add or edit theme objects in `src/theme/themes.ts`. The `ThemeProvider` maps theme values to CSS variables, so app colors update globally.

## Known Limitations

- Chess960 starting positions are generated with bishops on opposite colors and king between rooks. Full Chess960 castling depends on the installed `chess.js` support and is isolated in `src/game/chess960/`.
- Crazyhouse uses `chess.js` for normal moves and a separated pocket/drop layer. Advanced drop-check and dropmate edge cases are simplified.
- 4-player chess implements a local FFA rules layer with Red-Blue-Yellow-Green turn order, king-safety validation, check/checkmate elimination, stalemate scoring, dead armies, promotion, capture points, and multi-check bonuses. Online-only details such as disconnect handling and randomly moving resigned kings are not exposed in this offline local mode.
- The post-game review uses Stockfish MultiPV through the Electron bridge. Browser-only preview can show UI but cannot run engine review without the Electron preload bridge.
