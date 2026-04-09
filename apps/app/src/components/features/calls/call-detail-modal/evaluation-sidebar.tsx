"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@calls/ui";
import {
  BarChart3,
  Briefcase,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  User,
  UserCheck,
} from "lucide-react";
import type { CallDetail, EvaluationDetail, TranscriptDetail } from "./types";

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
  isWorkspaceAdmin: boolean;
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
  isWorkspaceAdmin,
}: EvaluationSidebarProps) {
  const qualityScore = evaluation?.managerScore ?? 0;
  const qualityFeedback = evaluation?.managerFeedback ?? "";
  const qualityNotAnalyzableReason = evaluation?.notAnalyzableReason;
  const isQualityAnalyzable = evaluation?.isQualityAnalyzable;
  const showQualityUnavailable = isQualityAnalyzable === false || !qualityScore;

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <Card className="border-border/60">
        <CardContent className="px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
          <p
            className={`flex min-w-0 items-center gap-2 wrap-break-word text-sm font-medium sm:text-base ${call.customerName ? "text-foreground" : "text-muted-foreground"}`}
          >
            <User className="size-4 shrink-0" />
            <span className="min-w-0 wrap-break-word">
              {call.customerName ? call.customerName : "Имя не определено"}
            </span>
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="px-4 pb-2 sm:px-6 sm:pb-3">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
            <BarChart3 className="size-3.5 shrink-0" />
            Оценка
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 px-4 pb-4 sm:space-y-6 sm:px-6 sm:pb-6">
          <section>
            <h4 className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
              <Briefcase className="size-3.5 shrink-0" />
              Ценность звонка для бизнеса
            </h4>
            <p className="text-muted-foreground mb-1 text-xs">
              Результат разговора: сделка, договорённости, решение проблемы
            </p>
            <div className="mb-2 flex justify-between text-sm font-medium">
              <span>Оценка</span>
              <span>{evaluation?.valueScore ?? 0}/5</span>
            </div>
            <div className="bg-muted mb-3 h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-[width]"
                style={{
                  width: `${(evaluation?.valueScore ?? 0) * 20}%`,
                }}
              />
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {evaluation?.valueExplanation ?? "Оценка отсутствует"}
            </p>
          </section>

          <div className="border-border/60 border-t pt-4">
            <h4 className="text-muted-foreground mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
              <UserCheck className="size-3.5 shrink-0" />
              Качество работы менеджера
            </h4>
            <p className="text-muted-foreground mb-1 text-xs">
              Коммуникация: эмпатия, вежливость, структурированность
            </p>
            {showQualityUnavailable ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="mb-1 text-sm font-medium text-destructive">Качество не оценивалось</p>
                <p className="text-destructive/80 text-xs">
                  {qualityNotAnalyzableReason ||
                    call.operatorName ||
                    call.managerName ||
                    "Автоответчик"}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-2 flex justify-between text-sm font-medium">
                  <span>Оценка</span>
                  <span>{qualityScore}/5</span>
                </div>
                <div className="bg-muted mb-3 h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-[width]"
                    style={{ width: `${Number(qualityScore) * 20}%` }}
                  />
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{qualityFeedback}</p>
              </>
            )}
          </div>
          {isWorkspaceAdmin && transcript?.text && (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="mt-4 w-full gap-2 sm:w-auto"
              onClick={onReevaluate}
              disabled={restarting || reevaluating}
              title="Переоценить звонок без повторной транскрипции"
            >
              {reevaluating ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
              ) : (
                <BarChart3 className="size-3.5 shrink-0" />
              )}
              {reevaluating ? "Оценка..." : "Переоценить"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200/60 bg-amber-50/50 dark:border-amber-800/60 dark:bg-amber-950/20">
        <CardHeader className="flex flex-col gap-2 px-4 pb-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <CardTitle className="text-amber-800 dark:text-amber-200 m-0 flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
            <Lightbulb className="size-3.5 shrink-0" />
            Рекомендации
          </CardTitle>
          {isWorkspaceAdmin && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full shrink-0 border-amber-600/50 text-amber-700 hover:bg-amber-100 sm:w-auto dark:border-amber-500/50 dark:text-amber-300 dark:hover:bg-amber-900/30"
              onClick={onGenerateRecommendations}
              disabled={isGeneratingRecommendations}
            >
              {isGeneratingRecommendations ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : evaluation?.managerRecommendations &&
                evaluation.managerRecommendations.length > 0 ? (
                "Обновить"
              ) : (
                "Сформировать"
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
          {evaluation?.managerRecommendations && evaluation.managerRecommendations.length > 0 ? (
            <>
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                Вопросы, которые можно было задать (с учётом истории):
              </p>
              <ul className="m-0 list-none space-y-2 p-0">
                {evaluation.managerRecommendations.map((rec, i) => (
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
              Нажмите &quot;Сформировать&quot;, чтобы получить рекомендации с учётом истории
              звонков.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="px-4 pb-2 sm:px-6 sm:pb-3">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
            <Sparkles className="size-3.5 shrink-0" />
            Резюме
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Тип:</span>
              <span className="font-medium">{transcript?.callType || "—"}</span>
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
            {isWorkspaceAdmin && (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="w-full min-w-0 gap-2 truncate sm:w-auto"
                onClick={onRestartAnalysis}
                disabled={restarting || reevaluating}
                title="Перезапустить анализ"
              >
                {restarting ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5 shrink-0" />
                )}
                <span className="min-w-0 truncate">
                  {restarting ? "Перезапуск..." : "Перезапустить анализ"}
                </span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
