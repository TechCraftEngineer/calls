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
  id: string;
  valueScore: number;
  valueExplanation: string;
  managerScore?: number | null;
  managerFeedback?: string | null;
  isQualityAnalyzable?: boolean | null;
  notAnalyzableReason?: string | null;
  managerRecommendations?: string[];
}

interface CallDetail {
  id: string;
  fileId?: string | null;
  sizeBytes?: number;
  customerName?: string;
  operatorName?: string | null;
  managerName?: string | null;
}

interface TranscriptDetail {
  callType?: string;
  sentiment?: string;
  summary?: string;
  text?: string;
}

interface CallSidebarProps {
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

function formatFileSize(bytes?: number): string {
  if (!bytes) return "0.00 MB";
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CallSidebar({
  call,
  transcript,
  evaluation,
  restarting,
  reevaluating,
  isGeneratingRecommendations,
  onRestartAnalysis,
  onReevaluate,
  onGenerateRecommendations,
}: CallSidebarProps) {
  const qualityScore = evaluation?.managerScore ?? 0;
  const qualityFeedback = evaluation?.managerFeedback ?? "";
  const qualityNotAnalyzableReason = evaluation?.notAnalyzableReason;
  const isQualityAnalyzable = evaluation?.isQualityAnalyzable;
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
            Размер файла: {formatFileSize(call.sizeBytes)}
          </div>
        </CardContent>
      </Card>

      {/* Абонент */}
      <Card className="sidebar-card">
        <CardContent className="p-4">
          <div
            className={`text-lg font-bold ${call.customerName ? "text-[#111]" : "text-[#999]"}`}
          >
            {call.customerName
              ? `Абонент: ${call.customerName}`
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
              <span>{evaluation?.valueScore || 0}/5</span>
            </div>
            <div className="score-bar-bg">
              <div
                className="score-bar-fill"
                style={{ width: `${(evaluation?.valueScore || 0) * 20}%` }}
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
              {evaluation?.valueExplanation || "Оценка отсутствует"}
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
                  call.operatorName ||
                  call.managerName ||
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
            variant="default"
            size="sm"
            onClick={onGenerateRecommendations}
            disabled={isGeneratingRecommendations}
            className="border-[#975A16] text-[#975A16] rounded px-2 py-1 text-[11px] h-auto bg-transparent hover:bg-[#975A16]/10"
          >
            {isGeneratingRecommendations
              ? "Загрузка…"
              : evaluation?.managerRecommendations &&
                  evaluation.managerRecommendations.length > 0
                ? "Обновить"
                : "Сформировать"}
          </Button>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0">
          {evaluation?.managerRecommendations &&
          evaluation.managerRecommendations.length > 0 ? (
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
                {evaluation.managerRecommendations.map((rec, i) => (
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
              <span className="meta-value">{transcript?.callType || "—"}</span>
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
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={onRestartAnalysis}
              disabled={restarting || reevaluating}
            >
              <span className="text-sm">🔄</span>
              {restarting ? "Перезапуск…" : "Перезапустить анализ"}
            </Button>
            {(transcript?.text || transcript?.summary) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReevaluate}
                disabled={restarting || reevaluating}
                title="Переоценить звонок"
              >
                <span className="text-sm">📊</span>
                {reevaluating ? "Оценка…" : "Переоценить"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
