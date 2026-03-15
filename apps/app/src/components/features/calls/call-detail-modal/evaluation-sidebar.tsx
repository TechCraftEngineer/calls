"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@calls/ui";
import { CallRecordPlayer } from "../call-record-player";
import type { CallDetail, EvaluationDetail, TranscriptDetail } from "./types";

function formatFileSize(bytes?: number): string {
  if (!bytes) return "0.00 MB";
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface EvaluationSidebarProps {
  call: CallDetail;
  transcript: TranscriptDetail | null;
  evaluation: EvaluationDetail | null;
  restarting: boolean;
  onRestartAnalysis: () => void;
  onGenerateRecommendations: () => void;
  isGeneratingRecommendations: boolean;
}

export default function EvaluationSidebar({
  call,
  transcript,
  evaluation,
  restarting,
  onRestartAnalysis,
  onGenerateRecommendations,
  isGeneratingRecommendations,
}: EvaluationSidebarProps) {
  const qualityScore =
    evaluation?.manager_score ??
    (evaluation as { manager_quality_score?: number })?.manager_quality_score ??
    0;
  const qualityFeedback =
    evaluation?.manager_feedback ??
    (evaluation as { manager_quality_explanation?: string })
      ?.manager_quality_explanation ??
    "";
  const qualityNotAnalyzableReason = evaluation?.not_analyzable_reason;
  const isQualityAnalyzable = evaluation?.is_quality_analyzable;
  const showQualityUnavailable = isQualityAnalyzable === false || !qualityScore;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-muted-foreground text-xs font-extrabold uppercase tracking-wider">
            🎵 ЗАПИСЬ ЗВОНКА
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CallRecordPlayer callId={call.id} />
          <p className="text-muted-foreground text-xs">
            Размер файла: {formatFileSize(call.size_bytes)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <p
            className={`text-lg font-bold ${call.customer_name ? "text-foreground" : "text-muted-foreground"}`}
          >
            {call.customer_name
              ? `Абонент: ${call.customer_name}`
              : "Имя: не определено"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-muted-foreground text-xs font-extrabold uppercase tracking-wider">
            📈 ОЦЕНКА
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="mb-2 flex justify-between text-[13px] font-semibold">
              <span>Ценность звонка</span>
              <span>{evaluation?.value_score || 0}/5</span>
            </div>
            <div className="bg-muted mb-4 h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{
                  width: `${(evaluation?.value_score || 0) * 20}%`,
                }}
              />
            </div>
            <p className="text-muted-foreground text-[13px] leading-relaxed">
              {evaluation?.value_explanation || "Оценка отсутствует"}
            </p>
          </div>

          {showQualityUnavailable ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
              <p className="mb-1 text-[13px] font-bold text-destructive">
                Качество не оценивалось
              </p>
              <p className="text-destructive/90 text-xs">
                {qualityNotAnalyzableReason ||
                  call.operator_name ||
                  call.manager_name ||
                  "Автоответчик"}
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-2 flex justify-between text-[13px] font-semibold">
                <span>Качество работы</span>
                <span>{qualityScore}/5</span>
              </div>
              <div className="bg-muted mb-4 h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-green-500 h-full rounded-full"
                  style={{ width: `${Number(qualityScore) * 20}%` }}
                />
              </div>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                {qualityFeedback}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-amber-800 dark:text-amber-200 m-0 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
            💡 РЕКОМЕНДАЦИИ
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-amber-700 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/50"
            onClick={onGenerateRecommendations}
            disabled={isGeneratingRecommendations}
          >
            {isGeneratingRecommendations
              ? "Загрузка..."
              : evaluation?.manager_recommendations &&
                  evaluation.manager_recommendations.length > 0
                ? "Обновить"
                : "Сформировать"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {evaluation?.manager_recommendations &&
          evaluation.manager_recommendations.length > 0 ? (
            <>
              <p className="text-amber-800 dark:text-amber-200 text-[13px]">
                Вопросы, которые можно было задать (с учетом истории):
              </p>
              <ul className="m-0 list-none space-y-2.5 p-0">
                {evaluation.manager_recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="text-amber-900 dark:text-amber-100 relative pl-5 text-[13px] leading-snug"
                  >
                    <span className="text-amber-500 absolute left-0">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-amber-800 dark:text-amber-200 m-0 text-[13px] italic">
              Нажмите &quot;Сформировать&quot;, чтобы получить рекомендации с
              учетом истории звонков.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-muted-foreground text-xs font-extrabold uppercase tracking-wider">
            📋 РЕЗЮМЕ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-[13px]">
              <span className="text-muted-foreground">Тип:</span>
              <span className="font-semibold">
                {transcript?.call_type || "—"}
              </span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-muted-foreground">Настрой:</span>
              <Badge
                variant="outline"
                className="border-amber-500/50 text-amber-700 dark:text-amber-400"
              >
                {transcript?.sentiment || "Нейтральный"}
              </Badge>
            </div>
          </div>
          <div className="border-border border-t pt-4">
            <p className="text-muted-foreground mb-5 text-[13px] leading-relaxed">
              {transcript?.summary || "Резюме отсутствует"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mb-3 w-full gap-2"
              onClick={onRestartAnalysis}
              disabled={restarting}
            >
              <span className="text-sm">🔄</span>
              {restarting ? "Перезапуск..." : "Перезапустить анализ"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
