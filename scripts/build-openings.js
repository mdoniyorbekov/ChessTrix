const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const { openingBook } = await import("@chess-openings/eco.json");
  const book = await openingBook();
  const output = Object.entries(book)
    .map(([fen, opening]) => ({
      fen,
      key: positionKey(fen),
      eco: opening.eco,
      name: opening.name,
      moves: opening.moves,
      source: opening.src
    }))
    .sort((a, b) => a.moves.length - b.moves.length || a.eco.localeCompare(b.eco));

  const target = path.join(__dirname, "..", "src", "data", "openings.json");
  fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${output.length.toLocaleString()} openings to ${target}`);
}

function positionKey(fen) {
  return fen.split(/\s+/).slice(0, 4).join(" ");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
