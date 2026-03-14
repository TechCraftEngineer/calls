"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import sanitizeHtml from "sanitize-html";
import AudioPlayer from "@/components/ui/audio-player";
import api, { API_BASE_URL, restPost } from "@/lib/api";
import type { User } from "@/lib/auth";

interface CallDetail {
  id: number;
  number: string;
  timestamp: string;
  duration_seconds: number;
  direction: string;
  internal_number?: string;
  manager_name?: string;
  operator_name?: string;
  filename?: string;
  size_bytes?: number;
  customer_name?: string;
}

interface TranscriptDetail {
  id: number;
  text: string;
  raw_text?: string;
  summary: string;
  call_type: string;
  call_topic: string;
  sentiment: string;
}

interface EvaluationDetail {
  id: number;
  value_score: number;
  value_explanation: string;
  manager_score?: number | null;
  manager_feedback?: string | null;
  is_quality_analyzable?: boolean | null;
  not_analyzable_reason?: string | null;
  manager_recommendations?: string[];
}

interface CallDetailModalProps {
  callId: number;
  onClose: () => void;
  user?: User | null;
  onCallDeleted?: (callId: number) => void;
}

export default function CallDetailModal({
  callId,
  onClose,
  user,
  onCallDeleted,
}: CallDetailModalProps) {
  const [call, setCall] = useState<CallDetail | null>(null);
  const [transcript, setTranscript] = useState<TranscriptDetail | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>("assemblyai");
  const [restarting, setRestarting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] =
    useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleGenerateRecommendations = async () => {
    if (!callId) return;
    try {
      setIsGeneratingRecommendations(true);
      const result = await api.calls.generateRecommendations({
        call_id: callId,
      });
      const recs =
        (result as { recommendations?: string[] })?.recommendations ?? [];

      setEvaluation((prev) => {
        if (!prev) {
          return {
            id: 0,
            value_score: 0,
            value_explanation: "",
            manager_score: 0,
            manager_feedback: "",
            manager_recommendations: recs,
          } as EvaluationDetail;
        }
        return { ...prev, manager_recommendations: recs };
      });
    } catch (error) {
      console.error("Failed to generate recommendations:", error);
      alert("Не удалось сформировать рекомендации");
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.calls.get({ call_id: callId });
      setCall(result.call as CallDetail);
      setTranscript((result.transcript ?? null) as TranscriptDetail | null);
      setEvaluation((result.evaluation ?? null) as EvaluationDetail | null);
      if (!(result.transcript as TranscriptDetail | null)?.raw_text)
        setShowRaw(false);
    } catch (error) {
      console.error("Failed to load call detail:", error);
    } finally {
      setLoading(false);
    }
  }, [callId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, showDeleteConfirm]);

  // Блокировка скролла body при открытом модальном окне
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const messages = useMemo(() => {
    const sourceText = showRaw
      ? transcript?.raw_text || transcript?.text
      : transcript?.text;
    if (!sourceText) return [];

    return sourceText
      .split("\n")
      .filter((l) => l.trim())
      .map((line) => {
        const parts = line.split(":");
        let speaker = "СИСТЕМА";
        let text = line;

        if (parts.length >= 2) {
          speaker = parts[0].trim().replace(/\*\*/g, "");
          text = parts.slice(1).join(":").trim();
        }

        const isOperator =
          speaker.toLowerCase().includes("оператор") ||
          speaker.toLowerCase().includes("менеджер") ||
          (call?.manager_name && speaker.includes(call.manager_name));

        const formattedText = text.replace(
          /\*\*(.*?)\*\*/g,
          "<strong>$1</strong>",
        );

        return { speaker, text: formattedText, isOperator };
      });
  }, [transcript, call, showRaw]);

  const handleDownloadTxt = () => {
    if (!transcript?.text) return;
    const element = document.createElement("a");
    const file = new Blob([transcript.text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `call_${call?.number || callId}_transcript.txt`;
    document.body.appendChild(element);
    element.click();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0.00 MB";
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleRestartAnalysis = async () => {
    if (!call || restarting) return;

    try {
      setRestarting(true);

      const transcribeResponse = await restPost<{ success?: boolean }>(
        `/calls/${callId}/transcribe?model=${selectedModel}`,
      );
      if (!transcribeResponse?.success) throw new Error("Transcription failed");

      // Шаг 2: Переоценка звонка
      try {
        await restPost(`/calls/${callId}/evaluate`);
      } catch (_evalError) {}

      await loadData();
      alert("Анализ успешно перезапущен!");
    } catch (error: unknown) {
      console.error("Failed to restart analysis:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Ошибка при перезапуске анализа";
      alert(`Ошибка: ${errorMessage}`);
    } finally {
      setRestarting(false);
    }
  };

  // Функция проверки прав администратора
  const isAdmin = useCallback((): boolean => {
    if (!user) return false;
    return (
      user.username === "admin@mango" ||
      user.username === "admin@gmail.com" ||
      user.role === "admin"
    );
  }, [user]);

  // Функция удаления звонка
  const handleDeleteCall = useCallback(async () => {
    if (!call || deleting) return;

    try {
      setDeleting(true);
      await api.calls.delete({ call_id: callId });

      // Успешно удалено
      setShowDeleteConfirm(false);
      if (onCallDeleted) {
        onCallDeleted(callId);
      }
      onClose();
    } catch (error: unknown) {
      console.error("Failed to delete call:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Ошибка при удалении звонка";
      alert(`Ошибка: ${errorMessage}`);
    } finally {
      setDeleting(false);
    }
  }, [call, callId, deleting, onCallDeleted, onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current && !showDeleteConfirm) {
      onClose();
    }
  };

  if (loading) {
    return (
      <div
        className="modal-overlay"
        ref={overlayRef}
        onClick={handleOverlayClick}
      >
        <div className="modal-container" ref={modalRef}>
          <div className="py-10 text-center">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div
        className="modal-overlay"
        ref={overlayRef}
        onClick={handleOverlayClick}
      >
        <div className="modal-container" ref={modalRef}>
          <div className="py-10 text-center">Звонок не найден</div>
        </div>
      </div>
    );
  }

  const isCompleted = call.duration_seconds > 0;
  const qualityScore =
    evaluation?.manager_score ??
    (evaluation as any)?.manager_quality_score ??
    0;
  const qualityFeedback =
    evaluation?.manager_feedback ??
    (evaluation as any)?.manager_quality_explanation ??
    "";
  const qualityNotAnalyzableReason = evaluation?.not_analyzable_reason;
  const isQualityAnalyzable = evaluation?.is_quality_analyzable;
  const showQualityUnavailable = isQualityAnalyzable === false || !qualityScore;

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      <div
        className="modal-container"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative pt-6 px-6">
          <button
            className="modal-close-btn absolute top-6 right-6 z-10"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="call-meta-header">
            <div className="call-title-row flex items-center justify-between w-full pr-[50px]">
              <div className="flex items-center gap-3 flex-1">
                <span className="call-main-number">{call.number}</span>
                <span className="call-direction-tag bg-[#F5F5F7] text-gray-500">
                  {call.direction === "incoming" ? "ВХОДЯЩИЙ" : "ИСХОДЯЩИЙ"}
                </span>
                <span className="call-status-tag">
                  {isCompleted ? "ЗАВЕРШЁН" : "ПРОПУЩЕН"}
                </span>
              </div>
              {isAdmin() && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="py-2 px-4 text-[13px] bg-red-500 text-white border-none rounded-lg cursor-pointer font-semibold flex items-center gap-1.5 transition-colors ml-auto hover:bg-red-600 disabled:opacity-60 disabled:hover:bg-red-500"
                  disabled={deleting}
                  title="Удалить звонок"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  {deleting ? "Удаление..." : "Удалить"}
                </button>
              )}
            </div>
            <div className="call-sub-meta">
              <div className="meta-item-inline">
                📅 {new Date(call.timestamp).toLocaleDateString()}
              </div>
              <div className="meta-item-inline">
                ⏰{" "}
                {new Date(call.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="meta-item-inline">
                ⏱️ {Math.round(call.duration_seconds)}с
              </div>
              <div className="meta-item-inline">
                👤 {call.manager_name || call.operator_name || "—"}
              </div>
            </div>
          </div>

          <div className="detail-grid">
            <div className="transcript-card">
              <div className="transcript-header flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="m-0 text-base font-bold flex items-center gap-2">
                    <span className="text-lg">💬</span> Расшифровка
                  </h3>

                  {transcript?.raw_text && (
                    <div className="flex bg-gray-100 p-0.5 rounded-md ml-2">
                      <button
                        onClick={() => setShowRaw(false)}
                        className={`py-1 px-2.5 text-[11px] border-none rounded cursor-pointer transition-all ${
                          !showRaw
                            ? "bg-white text-[#111] font-semibold shadow-sm"
                            : "bg-transparent text-gray-500"
                        }`}
                      >
                        Обработка
                      </button>
                      <button
                        onClick={() => setShowRaw(true)}
                        className={`py-1 px-2.5 text-[11px] border-none rounded cursor-pointer transition-all ${
                          showRaw
                            ? "bg-white text-[#111] font-semibold shadow-sm"
                            : "bg-transparent text-gray-500"
                        }`}
                      >
                        Оригинал
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className="ghost-btn h-8 text-xs py-0 px-3 flex items-center gap-1.5"
                  onClick={handleDownloadTxt}
                >
                  <span>📥</span> Скачать .txt
                </button>
              </div>

              <div className="message-list">
                {messages.length > 0 ? (
                  messages.map((m, i) => (
                    <div
                      key={i}
                      className={`message-item ${m.isOperator ? "is-operator" : ""}`}
                    >
                      <div className="avatar-circle-sm">
                        {m.speaker.includes("АВТООТВЕТЧИК")
                          ? "🤖"
                          : m.speaker[0]?.toUpperCase() || "👤"}
                      </div>
                      <div className="message-content">
                        <div className="speaker-name-sm">{m.speaker}</div>
                        <div
                          className="speech-bubble"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(m.text, {
                              allowedTags: [
                                "b",
                                "i",
                                "em",
                                "strong",
                                "br",
                                "p",
                              ],
                              allowedAttributes: {},
                              disallowedTagsMode: "discard",
                            }),
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-400">
                    Текст отсутствует
                  </div>
                )}
              </div>
            </div>

            <div className="info-sidebar">
              <div className="sidebar-card">
                <h4 className="sidebar-card-title">🎵 ЗАПИСЬ ЗВОНКА</h4>
                <div className="audio-player-container">
                  {call.filename ? (
                    <AudioPlayer
                      src={`${API_BASE_URL}/api/records/${call.filename}`}
                    />
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
                    onClick={handleGenerateRecommendations}
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
                          <span className="absolute left-0 text-[#F7931E]">
                            •
                          </span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-[13px] text-amber-800 italic m-0">
                    Нажмите "Сформировать", чтобы получить рекомендации с учетом
                    истории звонков.
                  </p>
                )}
              </div>

              <div className="sidebar-card">
                <h4 className="sidebar-card-title">📋 РЕЗЮМЕ</h4>
                <ul className="meta-list">
                  <li className="meta-row">
                    <span className="meta-label">Тип:</span>
                    <span className="meta-value">
                      {transcript?.call_type || "—"}
                    </span>
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
                    onChange={(e) => setSelectedModel(e.target.value)}
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
                  className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-3000 gap-2 ${
                    restarting
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                  onClick={handleRestartAnalysis}
                  disabled={restarting}
                >
                  <span className="text-sm">🔄</span>
                  {restarting ? "Перезапуск..." : "Перезапустить анализ"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay z-3000"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteConfirm(false);
            }
          }}
        >
          <div
            className="modal-container max-w-[480px] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold text-[#111]">
              Подтверждение удаления
            </h3>
            <p className="mb-6 text-sm text-gray-500 leading-relaxed">
              Вы уверены, что хотите удалить этот звонок?
            </p>
            {call && (
              <div className="mb-6 p-3 bg-gray-100 rounded-lg text-[13px] text-gray-600">
                <div>
                  <strong>Номер:</strong> {call.number}
                </div>
                <div>
                  <strong>Дата:</strong>{" "}
                  {new Date(call.timestamp).toLocaleString("ru-RU")}
                </div>
                <div>
                  <strong>Длительность:</strong>{" "}
                  {Math.round(call.duration_seconds)}с
                </div>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="py-2.5 px-5 text-sm bg-gray-100 text-gray-800 border border-gray-300 rounded-lg font-semibold transition-colors hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-gray-100"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteCall}
                disabled={deleting}
                className="py-2.5 px-5 text-sm bg-red-500 text-white border-none rounded-lg font-semibold flex items-center gap-2 transition-colors hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-red-500"
              >
                {deleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full inline-block animate-spin" />
                    Удаление...
                  </>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Удалить
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
