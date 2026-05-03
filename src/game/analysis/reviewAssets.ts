import type { ReviewClassification } from "./reviewEngine";

const reviewIconPaths: Partial<Record<ReviewClassification, string>> = {
  Book: "app-assets/chesscom/book_move.png",
  Brilliant: "app-assets/chesscom/brillian_move.png",
  Great: "app-assets/chesscom/great_move.png",
  Best: "app-assets/chesscom/best_move.png",
  Excellent: "app-assets/chesscom/excellent_move.png",
  Good: "app-assets/chesscom/good_move.png",
  Inaccuracy: "app-assets/chesscom/inaccuracy.png",
  Mistake: "app-assets/chesscom/mistake.png",
  Miss: "app-assets/chesscom/miss.png",
  Blunder: "app-assets/chesscom/blunder.png"
};

export function reviewIconPath(classification: ReviewClassification): string | undefined {
  return reviewIconPaths[classification];
}
