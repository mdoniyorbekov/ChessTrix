import { evaluationFillPercent, formatEvaluation, type EngineEvaluation } from "../../game/engine/evaluation";
import "./analysis.css";

type EvaluationBarProps = {
  evaluation?: EngineEvaluation | null;
  orientation?: "vertical" | "horizontal";
  height?: number;
  showText?: boolean;
};

export function EvaluationBar({ evaluation, orientation = "vertical", height = 120, showText = true }: EvaluationBarProps) {
  const fill = evaluationFillPercent(evaluation);
  return (
    <div className={`eval-bar eval-bar--${orientation}`} style={orientation === "vertical" ? { height } : undefined}>
      <div className="eval-bar__white" style={orientation === "vertical" ? { height: `${fill}%` } : { width: `${fill}%` }} />
      <span className="eval-bar__center" />
      {showText && <strong>{formatEvaluation(evaluation)}</strong>}
    </div>
  );
}
