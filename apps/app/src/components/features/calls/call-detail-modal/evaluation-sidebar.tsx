"use client";

import AudioPlayer from "@/components/ui/audio-player";
import { API_BASE_URL } from "@/lib/api";
import type { CallDetail, EvaluationDetail, TranscriptDetail } from "./types";

function formatFileSize(bytes?: number): string {
  if (!bytes) return "0.00 MB";
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface EvaluationSidebarProps {
  call: CallDetail;
  transcript: TranscriptDetail | null;
  evaluation: EvaluationDetail | null;
  selectedModel: string;
  restarting: boolean;
  onModelChange: (model: string) => void;
  onRestartAnalysis: () => void;
  onGenerateRecommendations: () => void;
  isGeneratingRecommendations: boolean;
}

export default function EvaluationSidebar({
  call,
  transcript,
  evaluation,
  selectedModel,
  restarting,
  onModelChange,
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
    <div className="info-sidebar">
      <div className="sidebar-card">
        <h4 className="sidebar-card-title">🎵 ЗАПИСЬ ЗВОНКА</h4>
        <div className="audio-player-container">
          {call.filename ? (
            <AudioPlayer src={`${API_BASE_URL}/api/records/${call.filename}`} />
          ) : (
            <div className="text-[13px] text-gray-400">
              Файл записи не найден
            </div>
          )}
        </div>
        <div className="mt-3 text-xs text-gray-400">
          Размер файла: {formatFileSize(call.size_bytes)}
        </div>
      </div>

      <div className="sidebar-card p-4 rounded-lg">
        <div
          className={`text-lg font-bold ${
            call.customer_name ? "text-[#111]" : "text-gray-400"
          }`}
        >
          {call.customer_name
            ? `Абонент: ${call.customer_name}`
            : "Имя: не определено"}
        </div>
      </div>

      <div className="sidebar-card">
        <h4 className="sidebar-card-title">📈 ОЦЕНКА</h4>
        <div className="score-item">
          <div className="score-header">
            <span>Ценность звонка</span>
            <span>{evaluation?.value_score || 0}/5</span>
          </div>
          <div className="score-bar-bg">
            <div
              className="score-bar-fill"
              style={{
                width: `${(evaluation?.value_score || 0) * 20}%`,
              }}
            />
          </div>
          <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
            {evaluation?.value_explanation || "Оценка отсутствует"}
          </p>
        </div>

        {showQualityUnavailable ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-600 text-[13px] font-bold mb-1">
              Качество не оценивалось
            </div>
            <div className="text-red-700 text-xs">
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
                className="score-bar-fill bg-green-500"
                style={{ width: `${Number(qualityScore) * 20}%` }}
              />
            </div>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              {qualityFeedback}
            </p>
          </div>
        )}
      </div>

      <div className="sidebar-card bg-amber-50 border-amber-200">
        <div className="flex justify-between items-center mb-3">
          <h4 className="sidebar-card-title text-amber-800 flex items-center gap-2 m-0">
            💡 РЕКОМЕНДАЦИИ
          </h4>
          <button
            type="button"
            onClick={onGenerateRecommendations}
            disabled={isGeneratingRecommendations}
            className="bg-transparent border border-amber-700 text-amber-700 rounded py-1 px-2 text-[11px] cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGeneratingRecommendations
              ? "Загрузка..."
              : evaluation?.manager_recommendations &&
                  evaluation.manager_recommendations.length > 0
                ? "Обновить"
                : "Сформировать"}
          </button>
        </div>
        {evaluation?.manager_recommendations &&
        evaluation.manager_recommendations.length > 0 ? (
          <>
            <p className="mb-3 text-[13px] text-amber-800">
              Вопросы, которые можно было задать (с учетом истории):
            </p>
            <ul className="m-0 p-0 list-none">
              {evaluation.manager_recommendations.map((rec, i) => (
                <li
                  key={i}
                  className="mb-2.5 text-[13px] leading-snug relative pl-5 text-[#533F03]"
                >
                  <span className="absolute left-0 text-[#F7931E]">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-[13px] text-amber-800 italic m-0">
            Нажмите &quot;Сформировать&quot;, чтобы получить рекомендации с
            учетом истории звонков.
          </p>
        )}
      </div>

      <div className="sidebar-card">
        <h4 className="sidebar-card-title">📋 РЕЗЮМЕ</h4>
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
        <hr className="border-none border-t border-gray-200 my-4" />
        <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
          {transcript?.summary || "Резюме отсутствует"}
        </p>
        <div className="flex gap-2 items-center mb-3">
          <label className="text-xs text-gray-500 whitespace-nowrap">
            Модель:
          </label>
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={restarting}
            className={`flex-1 py-1.5 px-2.5 text-xs border border-gray-300 rounded ${
              restarting
                ? "bg-gray-100 cursor-not-allowed"
                : "bg-white cursor-pointer"
            }`}
          >
            <option value="assemblyai">AssemblyAI</option>
            <option value="salutespeech">SaluteSpeech</option>
          </select>
        </div>
        <button
          type="button"
          className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-3000 gap-2 ${
            restarting ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
          }`}
          onClick={onRestartAnalysis}
          disabled={restarting}
        >
          <span className="text-sm">🔄</span>
          {restarting ? "Перезапуск..." : "Перезапустить анализ"}
        </button>
      </div>
    </div>
  );
}
