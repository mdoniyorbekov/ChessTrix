import { Activity } from "lucide-react";
import { evaluationStatus, formatEvaluation, type EngineEvaluation } from "../../game/engine/evaluation";
import { Badge } from "../common/Badge";
import { Card } from "../common/Card";
import { EvaluationBar } from "./EvaluationBar";
import "./analysis.css";

type AnalysisCardProps = {
  evaluation?: EngineEvaluation | null;
  engineMessage?: string;
};

export function AnalysisCard({ evaluation, engineMessage }: AnalysisCardProps) {
  return (
    <Card className="analysis-card">
      <div className="analysis-card__header">
        <h3>Analysis</h3>
        <Activity />
      </div>
      <div className="analysis-card__body">
        <EvaluationBar evaluation={evaluation} height={120} showText={false} />
        <div>
          <strong className="analysis-card__score">{formatEvaluation(evaluation)}</strong>
          <p>{evaluationStatus(evaluation)}</p>
          <Badge tone={engineMessage ? "danger" : "info"}>
            {engineMessage ?? `Depth ${evaluation?.depth ?? 0}`}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
