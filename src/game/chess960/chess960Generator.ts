const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

export type Chess960Position = {
  id: number;
  whiteBackRank: string;
  blackBackRank: string;
  fen: string;
};

export function generateChess960Position(): Chess960Position {
  const pieces = Array<string>(8).fill("");
  const darkSquares = [0, 2, 4, 6];
  const lightSquares = [1, 3, 5, 7];

  pieces[randomItem(darkSquares)] = "b";
  pieces[randomItem(lightSquares)] = "b";

  placeRandom(pieces, "q");
  placeRandom(pieces, "n");
  placeRandom(pieces, "n");

  const empty = pieces.map((piece, index) => (piece ? -1 : index)).filter((index) => index >= 0);
  pieces[empty[0]] = "r";
  pieces[empty[1]] = "k";
  pieces[empty[2]] = "r";

  const whiteBackRank = pieces.join("").toUpperCase();
  const blackBackRank = pieces.join("");
  const id = approximatePositionId(pieces.join(""));

  return {
    id,
    whiteBackRank,
    blackBackRank,
    fen: `${blackBackRank}/pppppppp/8/8/8/8/PPPPPPPP/${whiteBackRank} w KQkq - 0 1`
  };
}

export function describeChess960(position: Chess960Position) {
  return files.map((file, index) => `${file}:${position.whiteBackRank[index]}`).join(" ");
}

function placeRandom(pieces: string[], piece: string) {
  const empty = pieces.map((value, index) => (value ? -1 : index)).filter((index) => index >= 0);
  pieces[randomItem(empty)] = piece;
}

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function approximatePositionId(backRank: string) {
  let hash = 0;
  for (const char of backRank) hash = (hash * 31 + char.charCodeAt(0)) % 960;
  return hash + 1;
}
