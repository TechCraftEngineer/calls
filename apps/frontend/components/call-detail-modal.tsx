"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api, { API_BASE_URL, restPost } from "@/lib/api";
import type { User } from "@/lib/auth";
import AudioPlayer from "./audio-player";

interface Message {
  speaker: string;
  text: string;
  isOperator: boolean;
}

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
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
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
      } catch (evalError) {}

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
          <div style={{ padding: "40px", textAlign: "center" }}>
            Загрузка...
          </div>
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
          <div style={{ padding: "40px", textAlign: "center" }}>
            Звонок не найден
          </div>
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
        <div style={{ position: "relative", padding: "24px 24px 0 24px" }}>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              position: "absolute",
              top: "24px",
              right: "24px",
              zIndex: 10,
            }}
          >
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="call-meta-header">
            <div
              className="call-title-row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                paddingRight: "50px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flex: 1,
                }}
              >
                <span className="call-main-number">{call.number}</span>
                <span
                  className="call-direction-tag"
                  style={{ background: "#F5F5F7", color: "#888" }}
                >
                  {call.direction === "incoming" ? "ВХОДЯЩИЙ" : "ИСХОДЯЩИЙ"}
                </span>
                <span className="call-status-tag">
                  {isCompleted ? "ЗАВЕРШЁН" : "ПРОПУЩЕН"}
                </span>
              </div>
              {isAdmin() && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    background: "#FF3B30",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "background 0.2s",
                    opacity: deleting ? 0.6 : 1,
                    marginLeft: "auto",
                  }}
                  onMouseEnter={(e) => {
                    if (!deleting) e.currentTarget.style.background = "#E02D21";
                  }}
                  onMouseLeave={(e) => {
                    if (!deleting) e.currentTarget.style.background = "#FF3B30";
                  }}
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
              <div
                className="transcript-header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "16px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "18px" }}>💬</span> Расшифровка
                  </h3>

                  {transcript?.raw_text && (
                    <div
                      style={{
                        display: "flex",
                        background: "#F0F0F0",
                        padding: "2px",
                        borderRadius: "6px",
                        marginLeft: "8px",
                      }}
                    >
                      <button
                        onClick={() => setShowRaw(false)}
                        style={{
                          padding: "4px 10px",
                          fontSize: "11px",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          background: !showRaw ? "white" : "transparent",
                          color: !showRaw ? "#111" : "#666",
                          fontWeight: !showRaw ? 600 : 400,
                          boxShadow: !showRaw
                            ? "0 1px 3px rgba(0,0,0,0.1)"
                            : "none",
                          transition: "all 0.2s",
                        }}
                      >
                        Обработка
                      </button>
                      <button
                        onClick={() => setShowRaw(true)}
                        style={{
                          padding: "4px 10px",
                          fontSize: "11px",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          background: showRaw ? "white" : "transparent",
                          color: showRaw ? "#111" : "#666",
                          fontWeight: showRaw ? 600 : 400,
                          boxShadow: showRaw
                            ? "0 1px 3px rgba(0,0,0,0.1)"
                            : "none",
                          transition: "all 0.2s",
                        }}
                      >
                        Оригинал
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className="ghost-btn"
                  style={{
                    height: "32px",
                    fontSize: "12px",
                    padding: "0 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
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
                          dangerouslySetInnerHTML={{ __html: m.text }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#999",
                    }}
                  >
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
                    <div style={{ fontSize: "13px", color: "#999" }}>
                      Файл записи не найден
                    </div>
                  )}
                </div>
                <div
                  style={{ marginTop: "12px", fontSize: "12px", color: "#999" }}
                >
                  Размер файла: {formatFileSize(call.size_bytes)}
                </div>
              </div>

              <div
                className="sidebar-card"
                style={{ padding: "16px", borderRadius: "8px" }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: call.customer_name ? "#111" : "#999",
                  }}
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
                    ></div>
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
                      ></div>
                    </div>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#666",
                        lineHeight: 1.6,
                      }}
                    >
                      {qualityFeedback}
                    </p>
                  </div>
                )}
              </div>

              <div
                className="sidebar-card"
                style={{ background: "#FFFDF0", borderColor: "#FFECB3" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <h4
                    className="sidebar-card-title"
                    style={{
                      color: "#975A16",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      margin: 0,
                    }}
                  >
                    💡 РЕКОМЕНДАЦИИ
                  </h4>
                  <button
                    onClick={handleGenerateRecommendations}
                    disabled={isGeneratingRecommendations}
                    style={{
                      background: "transparent",
                      border: "1px solid #975A16",
                      color: "#975A16",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      fontSize: "11px",
                      cursor: isGeneratingRecommendations
                        ? "not-allowed"
                        : "pointer",
                      opacity: isGeneratingRecommendations ? 0.6 : 1,
                      transition: "all 0.2s",
                    }}
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
                    <p
                      style={{
                        margin: "0 0 12px 0",
                        fontSize: "13px",
                        color: "#856404",
                      }}
                    >
                      Вопросы, которые можно было задать (с учетом истории):
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
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#856404",
                      fontStyle: "italic",
                      margin: 0,
                    }}
                  >
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
                    <span className="meta-value" style={{ color: "#F7931E" }}>
                      {transcript?.sentiment || "Нейтральный"}
                    </span>
                  </li>
                </ul>
                <hr
                  style={{
                    border: "none",
                    borderTop: "1px solid #eee",
                    margin: "16px 0",
                  }}
                />
                <p
                  style={{
                    fontSize: "13px",
                    color: "#666",
                    lineHeight: 1.6,
                    marginBottom: "20px",
                  }}
                >
                  {transcript?.summary || "Резюме отсутствует"}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Модель:
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={restarting}
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      fontSize: "12px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      background: restarting ? "#f5f5f5" : "white",
                      cursor: restarting ? "not-allowed" : "pointer",
                    }}
                  >
                    <option value="assemblyai">AssemblyAI</option>
                    <option value="salutespeech">SaluteSpeech</option>
                  </select>
                </div>
                <button
                  className="ghost-btn"
                  style={{
                    width: "100%",
                    fontSize: "12px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    opacity: restarting ? 0.6 : 1,
                    cursor: restarting ? "not-allowed" : "pointer",
                  }}
                  onClick={handleRestartAnalysis}
                  disabled={restarting}
                >
                  <span style={{ fontSize: "14px" }}>🔄</span>
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
          className="modal-overlay"
          style={{ zIndex: 3000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteConfirm(false);
            }
          }}
        >
          <div
            className="modal-container"
            style={{ maxWidth: "480px", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                fontSize: "18px",
                fontWeight: 700,
                color: "#111",
              }}
            >
              Подтверждение удаления
            </h3>
            <p
              style={{
                margin: "0 0 24px 0",
                fontSize: "14px",
                color: "#666",
                lineHeight: 1.6,
              }}
            >
              Вы уверены, что хотите удалить этот звонок?
            </p>
            {call && (
              <div
                style={{
                  marginBottom: "24px",
                  padding: "12px",
                  background: "#f5f5f5",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "#555",
                }}
              >
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
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  background: "#f5f5f5",
                  color: "#333",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  cursor: deleting ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  transition: "background 0.2s",
                  opacity: deleting ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!deleting) e.currentTarget.style.background = "#eee";
                }}
                onMouseLeave={(e) => {
                  if (!deleting) e.currentTarget.style.background = "#f5f5f5";
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteCall}
                disabled={deleting}
                style={{
                  padding: "10px 20px",
                  fontSize: "14px",
                  background: "#FF3B30",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: deleting ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  transition: "background 0.2s",
                  opacity: deleting ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  if (!deleting) e.currentTarget.style.background = "#E02D21";
                }}
                onMouseLeave={(e) => {
                  if (!deleting) e.currentTarget.style.background = "#FF3B30";
                }}
              >
                {deleting ? (
                  <>
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        border: "2px solid rgba(255, 255, 255, 0.3)",
                        borderTop: "2px solid white",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "spin 0.8s linear infinite",
                      }}
                    ></span>
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
            <style jsx>{`
              .spinner {
                width: 14px;
                height: 14px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
}
