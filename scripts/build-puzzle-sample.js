const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const inputPath = process.argv[2] ?? path.join(process.env.USERPROFILE ?? "", "Desktop", "puzzle", "lichess_puzzle_transformed.csv");
const outputPath = process.argv[3] ?? path.join(__dirname, "..", "src", "data", "puzzles.json");
const bucketStart = 800;
const bucketEnd = 2700;
const bucketSize = 100;
const limitPerBucket = 100;

const buckets = new Map();
for (let lower = bucketStart; lower < bucketEnd; lower += bucketSize) {
  buckets.set(bucketKey(lower), []);
}

let rowCount = 0;

async function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Puzzle CSV not found: ${inputPath}`);
  }

  const stream = fs.createReadStream(inputPath);
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let headers = null;

  for await (const line of lines) {
    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }

    if (!line.trim()) continue;
    rowCount += 1;
    const row = toRow(headers, parseCsvLine(line));
    const rating = Number(row.Rating);
    const lower = Math.floor(rating / bucketSize) * bucketSize;
    const bucket = buckets.get(bucketKey(lower));
    if (!bucket) continue;

    const popularity = Number(row.Popularity) || 0;
    const plays = Number(row.NbPlays) || 0;
    const moves = String(row.Moves ?? "").trim().split(/\s+/).filter(Boolean);
    if (!row.FEN || moves.length === 0) continue;

    pushTop(bucket, {
      sourceId: row.PuzzleId,
      fen: row.FEN,
      solution: moves,
      rating,
      popularity,
      plays,
      theme: primaryTheme(row.Themes),
      themes: String(row.Themes ?? "").trim(),
      gameUrl: row.GameUrl,
      bucket: bucketKey(lower)
    });
  }

  const puzzles = [];
  for (const [bucket, items] of buckets) {
    items.sort(comparePuzzleCandidates);
    items.forEach((item) => {
      puzzles.push({
        id: puzzles.length + 1,
        sourceId: item.sourceId,
        fen: item.fen,
        solution: item.solution,
        rating: item.rating,
        ratingRange: bucket,
        popularity: item.popularity,
        plays: item.plays,
        theme: item.theme,
        themes: item.themes,
        title: `${bucket} Puzzle ${items.indexOf(item) + 1}`
      });
    });
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(puzzles, null, 2)}\n`);
  console.log(`Read ${rowCount.toLocaleString()} rows`);
  console.log(`Wrote ${puzzles.length.toLocaleString()} puzzles to ${outputPath}`);
}

function pushTop(bucket, item) {
  bucket.push(item);
  bucket.sort(comparePuzzleCandidates);
  if (bucket.length > limitPerBucket) bucket.length = limitPerBucket;
}

function comparePuzzleCandidates(a, b) {
  return b.popularity - a.popularity || b.plays - a.plays || a.rating - b.rating || String(a.sourceId).localeCompare(String(b.sourceId));
}

function bucketKey(lower) {
  return `${lower}-${lower + bucketSize}`;
}

function primaryTheme(themes) {
  return String(themes ?? "").trim().split(/\s+/)[0] || "tactic";
}

function toRow(headers, values) {
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index] ?? "";
  });
  return row;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      if (quoted && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
