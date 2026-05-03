import { cpToWinPercent, mateToCp, normalizeScoreToWhitePov, winLossToAccuracy, type ReviewClassification } from "./reviewEngine";

export type ReviewFixture = {
  id: string;
  description: string;
  fenBefore: string;
  actualMove: string;
  expectedLabels: ReviewClassification[];
  expectedAccuracyRange: [number, number];
  reasonIncludes: string;
};

export const reviewTestPositions: ReviewFixture[] = [
  {
    id: "book-e4",
    description: "Known opening move should be Book and excluded from accuracy average.",
    fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    actualMove: "e2e4",
    expectedLabels: ["Book"],
    expectedAccuracyRange: [100, 100],
    reasonIncludes: "opening"
  },
  {
    id: "best-close",
    description: "Top engine move or equivalent move should remain Best.",
    fenBefore: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3",
    actualMove: "e1g1",
    expectedLabels: ["Best", "Excellent"],
    expectedAccuracyRange: [90, 100],
    reasonIncludes: "engine"
  },
  {
    id: "excellent-close",
    description: "Small but real loss should be Excellent, not Best.",
    fenBefore: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3",
    actualMove: "d2d3",
    expectedLabels: ["Excellent", "Good"],
    expectedAccuracyRange: [80, 95],
    reasonIncludes: "close"
  },
  {
    id: "good-stable",
    description: "Stable non-critical move should be Good.",
    fenBefore: "rnbqkbnr/ppp2ppp/3p4/4p3/4P3/3P4/PPP2PPP/RNBQKBNR w KQkq - 0 3",
    actualMove: "g1f3",
    expectedLabels: ["Good", "Excellent"],
    expectedAccuracyRange: [65, 90],
    reasonIncludes: "stable"
  },
  {
    id: "inaccuracy",
    description: "Moderate win probability loss should be Inaccuracy.",
    fenBefore: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    actualMove: "a2a3",
    expectedLabels: ["Inaccuracy", "Mistake"],
    expectedAccuracyRange: [45, 75],
    reasonIncludes: "worsens"
  },
  {
    id: "mistake",
    description: "Significant objective loss should be Mistake.",
    fenBefore: "r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 5",
    actualMove: "h2h3",
    expectedLabels: ["Mistake", "Blunder"],
    expectedAccuracyRange: [20, 55],
    reasonIncludes: "significantly"
  },
  {
    id: "blunder-hanging-queen",
    description: "Move allowing decisive material loss should be Blunder.",
    fenBefore: "rnb1kbnr/pppp1ppp/8/4p3/4P1q1/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    actualMove: "b1c3",
    expectedLabels: ["Blunder"],
    expectedAccuracyRange: [0, 35],
    reasonIncludes: "decisive"
  },
  {
    id: "missed-mate",
    description: "Missing mate in one should be Miss, not a generic Mistake.",
    fenBefore: "6k1/5ppp/8/8/8/8/5PP1/6KQ w - - 0 1",
    actualMove: "h1h3",
    expectedLabels: ["Miss"],
    expectedAccuracyRange: [0, 35],
    reasonIncludes: "mate"
  },
  {
    id: "checkmate",
    description: "Actual checkmate should be Checkmate with perfect accuracy.",
    fenBefore: "6k1/5ppp/8/8/8/8/5PP1/6KQ w - - 0 1",
    actualMove: "h1h7",
    expectedLabels: ["Checkmate", "Best"],
    expectedAccuracyRange: [95, 100],
    reasonIncludes: "checkmate"
  },
  {
    id: "great-defense",
    description: "Only practical defensive resource should be Great when engine confirms it.",
    fenBefore: "6k1/5ppp/8/8/8/2q5/5PPP/4R1K1 w - - 0 1",
    actualMove: "e1e8",
    expectedLabels: ["Great", "Best"],
    expectedAccuracyRange: [90, 100],
    reasonIncludes: "critical"
  },
  {
    id: "brilliant-sacrifice",
    description: "Engine-approved sacrifice should be Brilliant/Great, never Miss.",
    fenBefore: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 4 5",
    actualMove: "c4f7",
    expectedLabels: ["Brilliant", "Great"],
    expectedAccuracyRange: [90, 100],
    reasonIncludes: "sacrifice"
  },
  {
    id: "simple-recapture-not-brilliant",
    description: "Obvious recapture should not be Brilliant without a deeper tactical sacrifice.",
    fenBefore: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    actualMove: "d1h5",
    expectedLabels: ["Best", "Excellent", "Good"],
    expectedAccuracyRange: [65, 100],
    reasonIncludes: "not brilliant"
  },
  {
    id: "forced-only-legal",
    description: "Only legal move should be Forced.",
    fenBefore: "7k/6Q1/6K1/8/8/8/8/8 b - - 0 1",
    actualMove: "h8g8",
    expectedLabels: ["Forced"],
    expectedAccuracyRange: [100, 100],
    reasonIncludes: "Only legal"
  },
  {
    id: "black-perspective-blunder",
    description: "Bad Black move must be punished when White POV improves.",
    fenBefore: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    actualMove: "f7f6",
    expectedLabels: ["Inaccuracy", "Mistake", "Blunder"],
    expectedAccuracyRange: [0, 75],
    reasonIncludes: "Black POV"
  }
];

export function runReviewMathSelfCheck() {
  const blackBad = normalizeScoreToWhitePov({ type: "cp", value: 200, pov: "white", depth: 1 }, "b", "b");
  const blackGood = normalizeScoreToWhitePov({ type: "cp", value: -200, pov: "white", depth: 1 }, "b", "b");
  const sideToMoveBlack = normalizeScoreToWhitePov({ type: "cp", value: 120, pov: "sideToMove", depth: 1 }, "b", "b");
  const mateCp = mateToCp(3);
  const winLoss = cpToWinPercent(300) - cpToWinPercent(0);
  const accuracy = winLossToAccuracy(winLoss);

  return {
    blackPerspectiveFlipPasses: blackBad.cpMover < 0 && blackGood.cpMover > 0 && sideToMoveBlack.cpWhite < 0 && sideToMoveBlack.cpMover > 0,
    mateCpPasses: mateCp === 99700,
    accuracyIsClamped: accuracy >= 0 && accuracy <= 100,
    samples: { blackBad, blackGood, sideToMoveBlack, mateCp, winLoss, accuracy }
  };
}
