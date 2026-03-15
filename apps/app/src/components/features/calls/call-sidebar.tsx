"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "@calls/ui";
import { CallRecordPlayer } from "./call-record-player";

interface EvaluationDetail {
  id: number;
  value_score: number;
  value_explanation: string;
  manager_score?: number | null;
  manager_feedback?: string | null;
  manager_quality_score?: number | null;
  manager_quality_explanation?: string | null;
  is_quality_analyzable?: boolean | null;
  not_analyzable_reason?: string | null;
  manager_recommendations?: string[];
}

interface CallDetail {
  id: number;
  filename?: string;
  size_bytes?: number;
  customer_name?: string;
  operator_name?: string;
  manager_name?: string;
}

interface TranscriptDetail {
  call_type?: string;
  sentiment?: string;
  summary?: string;
}

interface CallSidebarProps {
  call: CallDetail;
  transcript: TranscriptDetail | null;
  evaluation: EvaluationDetail | null;
  restarting: boolean;
  isGeneratingRecommendations: boolean;
  onRestartAnalysis: () => void;
  onGenerateRecommendations: () => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "0.00 MB";
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CallSidebar({
  call,
  transcript,
  evaluation,
  restarting,
  isGeneratingRecommendations,
  onRestartAnalysis,
  onGenerateRecommendations,
}: CallSidebarProps) {
  const qualityScore =
    evaluation?.manager_score ?? evaluation?.manager_quality_score ?? 0;
  const qualityFeedback =
    evaluation?.manager_feedback ??
    evaluation?.manager_quality_explanation ??
    "";
  const qualityNotAnalyzableReason = evaluation?.not_analyzable_reason;
  const isQualityAnalyzable = evaluation?.is_quality_analyzable;
  const showQualityUnavailable = isQualityAnalyzable === false || !qualityScore;

  return (
    <div className="info-sidebar">
      {/* Запись звонка */}
      <Card className="sidebar-card">
        <CardHeader className="px-6 pt-6 pb-0">
          <CardTitle className="sidebar-card-title">🎵 ЗАПИСЬ ЗВОНКА</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-4">
          <div className="audio-player-container">
            <CallRecordPlayer callId={call.id} />
          </div>
          <div className="mt-3 text-xs text-[#999]">
            Размер файла: {formatFileSize(call.size_bytes)}
          </div>
        </CardContent>
      </Card>

      {/* Абонент */}
      <Card className="sidebar-card">
        <CardContent className="p-4">
          <div
            className={`text-lg font-bold ${call.customer_name ? "text-[#111]" : "text-[#999]"}`}
          >
            {call.customer_name
              ? `Абонент: ${call.customer_name}`
              : "Имя: не определено"}
          </div>
        </CardContent>
      </Card>

      {/* Оценка */}
      <Card className="sidebar-card">
        <CardHeader className="px-6 pt-6 pb-0">
          <CardTitle className="sidebar-card-title">📈 ОЦЕНКА</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-4">
          <div className="score-item">
            <div className="score-header">
              <span>Ценность звонка</span>
              <span>{evaluation?.value_score || 0}/5</span>
            </div>
            <div className="score-bar-bg">
              <div
                className="score-bar-fill"
                style={{ width: `${(evaluation?.value_score || 0) * 20}%` }}
              />
            </div>
            <p
              style={{
                fontSize: "13px",
                color: "#666",
                lineHeight: 1.6,
                marginBottom: "20px",
              }}
            >
              {evaluation?.value_explanation || "Оценка отсутствует"}
            </p>
          </div>

          {showQualityUnavailable ? (
            <div
              style={{
                padding: "16px",
                background: "#FFF5F5",
                border: "1px solid #FFDADA",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  color: "#E53E3E",
                  fontSize: "13px",
                  fontWeight: 700,
                  marginBottom: "4px",
                }}
              >
                Качество не оценивалось
              </div>
              <div style={{ color: "#C53030", fontSize: "12px" }}>
                {qualityNotAnalyzableReason ||
                  call.operator_name ||
                  call.manager_name ||
                  "Автоответчик"}
              </div>
            </div>
          ) : (
            <div className="score-item">
              <div className="score-header">
                <span>Качество работы</span>
                <span>{qualityScore}/5</span>
              </div>
              <div className="score-bar-bg">
                <div
                  className="score-bar-fill"
                  style={{
                    width: `${Number(qualityScore) * 20}%`,
                    background: "#4CAF50",
                  }}
                />
              </div>
              <p style={{ fontSize: "13px", color: "#666", lineHeight: 1.6 }}>
                {qualityFeedback}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Рекомендации */}
      <Card
        className="sidebar-card"
        style={{ background: "#FFFDF0", borderColor: "#FFECB3" }}
      >
        <CardHeader className="flex flex-row justify-between items-center pb-3 px-6 pt-6">
          <CardTitle className="sidebar-card-title text-[#975A16] flex items-center gap-2 m-0">
            💡 РЕКОМЕНДАЦИИ
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateRecommendations}
            disabled={isGeneratingRecommendations}
            className="border-[#975A16] text-[#975A16] rounded px-2 py-1 text-[11px] h-auto bg-transparent hover:bg-[#975A16]/10"
          >
            {isGeneratingRecommendations
              ? "Загрузка…"
              : evaluation?.manager_recommendations &&
                  evaluation.manager_recommendations.length > 0
                ? "Обновить"
                : "Сформировать"}
          </Button>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0">
          {evaluation?.manager_recommendations &&
          evaluation.manager_recommendations.length > 0 ? (
            <>
              <p
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "13px",
                  color: "#856404",
                }}
              >
                Вопросы, которые можно было задать (с учётом истории):
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {evaluation.manager_recommendations.map((rec, i) => (
                  <li
                    key={i}
                    style={{
                      marginBottom: "10px",
                      fontSize: "13px",
                      lineHeight: "1.5",
                      position: "relative",
                      paddingLeft: "20px",
                      color: "#533F03",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        color: "#F7931E",
                      }}
                    >
                      •
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[13px] text-[#856404] italic m-0">
              Нажмите «Сформировать», чтобы получить рекомендации с учётом
              истории звонков.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Резюме */}
      <Card className="sidebar-card">
        <CardHeader className="px-6 pt-6 pb-0">
          <CardTitle className="sidebar-card-title">📋 РЕЗЮМЕ</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-4">
          <ul className="meta-list">
            <li className="meta-row">
              <span className="meta-label">Тип:</span>
              <span className="meta-value">{transcript?.call_type || "—"}</span>
            </li>
            <li className="meta-row">
              <span className="meta-label">Настрой:</span>
              <span className="meta-value text-[#F7931E]">
                {transcript?.sentiment || "Нейтральный"}
              </span>
            </li>
          </ul>
          <Separator className="my-4 bg-[#eee]" />
          <p className="text-[13px] text-[#666] leading-relaxed mb-5">
            {transcript?.summary || "Резюме отсутствует"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={onRestartAnalysis}
            disabled={restarting}
          >
            <span className="text-sm">🔄</span>
            {restarting ? "Перезапуск…" : "Перезапустить анализ"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
