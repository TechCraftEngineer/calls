"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@calls/ui";
import {
  BarChart3,
  FileAudio,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  User,
} from "lucide-react";
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
  reevaluating: boolean;
  onRestartAnalysis: () => void;
  onReevaluate: () => void;
  onGenerateRecommendations: () => void;
  isGeneratingRecommendations: boolean;
}

export default function EvaluationSidebar({
  call,
  transcript,
  evaluation,
  restarting,
  reevaluating,
  onRestartAnalysis,
  onReevaluate,
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
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
            <FileAudio className="size-3.5" />
            Запись звонка
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CallRecordPlayer callId={call.id} />
          <p className="text-muted-foreground text-xs">
            Размер: {formatFileSize(call.size_bytes)}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="pt-6">
          <p
            className={`flex items-center gap-2 text-base font-medium ${call.customer_name ? "text-foreground" : "text-muted-foreground"}`}
          >
            <User className="size-4 shrink-0" />
            {call.customer_name ? call.customer_name : "Имя не определено"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
            <BarChart3 className="size-3.5" />
            Оценка
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="mb-2 flex justify-between text-sm font-medium">
              <span>Ценность звонка</span>
              <span>{evaluation?.value_score || 0}/5</span>
            </div>
            <div className="bg-muted mb-3 h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-[width]"
                style={{
                  width: `${(evaluation?.value_score || 0) * 20}%`,
                }}
              />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {evaluation?.value_explanation || "Оценка отсутствует"}
            </p>
          </div>

          {showQualityUnavailable ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="mb-1 text-sm font-medium text-destructive">
                Качество не оценивалось
              </p>
              <p className="text-destructive/80 text-xs">
                {qualityNotAnalyzableReason ||
                  call.operator_name ||
                  call.manager_name ||
                  "Автоответчик"}
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-2 flex justify-between text-sm font-medium">
                <span>Качество работы</span>
                <span>{qualityScore}/5</span>
              </div>
              <div className="bg-muted mb-3 h-2 overflow-hidden rounded-full">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-[width]"
                  style={{ width: `${Number(qualityScore) * 20}%` }}
                />
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {qualityFeedback}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200/60 bg-amber-50/50 dark:border-amber-800/60 dark:bg-amber-950/20">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-amber-800 dark:text-amber-200 m-0 flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
            <Lightbulb className="size-3.5" />
            Рекомендации
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-amber-600/50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/50 dark:text-amber-300 dark:hover:bg-amber-900/30"
            onClick={onGenerateRecommendations}
            disabled={isGeneratingRecommendations}
          >
            {isGeneratingRecommendations ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : evaluation?.manager_recommendations &&
              evaluation.manager_recommendations.length > 0 ? (
              "Обновить"
            ) : (
              "Сформировать"
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {evaluation?.manager_recommendations &&
          evaluation.manager_recommendations.length > 0 ? (
            <>
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                Вопросы, которые можно было задать (с учётом истории):
              </p>
              <ul className="m-0 list-none space-y-2 p-0">
                {evaluation.manager_recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="text-amber-900 dark:text-amber-100 relative pl-4 text-sm leading-snug before:absolute before:left-0 before:content-['•'] before:text-amber-500"
                  >
                    {rec}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-amber-800 dark:text-amber-200 m-0 text-sm italic">
              Нажмите &quot;Сформировать&quot;, чтобы получить рекомендации с
              учётом истории звонков.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
            <Sparkles className="size-3.5" />
            Резюме
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Тип:</span>
              <span className="font-medium">
                {transcript?.call_type || "—"}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2 text-sm">
              <span className="text-muted-foreground">Настрой:</span>
              <Badge
                variant="outline"
                className="border-amber-500/50 text-amber-700 dark:text-amber-400"
              >
                {transcript?.sentiment || "Нейтральный"}
              </Badge>
            </div>
          </div>
          <div className="border-border/60 border-t pt-4">
            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
              {transcript?.summary || "Резюме отсутствует"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 gap-2 min-w-0"
                onClick={onRestartAnalysis}
                disabled={restarting || reevaluating}
              >
                {restarting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                {restarting ? "Перезапуск..." : "Перезапустить анализ"}
              </Button>
              {transcript?.text && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={onReevaluate}
                  disabled={restarting || reevaluating}
                  title="Переоценить звонок без повторной транскрипции"
                >
                  {reevaluating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <BarChart3 className="size-3.5" />
                  )}
                  {reevaluating ? "Оценка..." : "Переоценить"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
