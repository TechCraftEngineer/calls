"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import api, { restPost } from "@/lib/api";
import { getCurrentUser, type User } from "@/lib/auth";

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

export default function CallDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [call, setCall] = useState<CallDetail | null>(null);
  const [transcript, setTranscript] = useState<TranscriptDetail | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>("assemblyai");
  const [restarting, setRestarting] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] =
    useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push("/");
        return;
      }
      setUser(currentUser);

      const result = await api.calls.get({ call_id: Number(id) });
      setCall(result.call as CallDetail);
      setTranscript((result.transcript ?? null) as TranscriptDetail | null);
      setEvaluation((result.evaluation ?? null) as EvaluationDetail | null);
    } catch (error) {
      console.error("Failed to load call detail:", error);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const messages = useMemo(() => {
    // Используем raw_text если переключено на "Оригинал", иначе обработанный текст
    const sourceText = showRaw
      ? transcript?.raw_text || transcript?.text
      : transcript?.text;
    if (!sourceText) return [];

    return sourceText
      .split("\n")
      .filter((l) => l.trim())
      .map((line) => {
        // Don't clean up **, just detect speaker
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

        // Simple bold replace for display
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
    element.download = `call_${call?.number || id}_transcript.txt`;
    document.body.appendChild(element);
    element.click();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0.00 MB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleGenerateRecommendations = async () => {
    if (!id || isGeneratingRecommendations) return;
    try {
      setIsGeneratingRecommendations(true);
      const result = await api.calls.generateRecommendations({
        call_id: Number(id),
      });
      const recs = (result as { recommendations?: string[] })?.recommendations;
      setEvaluation((prev) => {
        if (!prev) {
          return {
            id: 0,
            value_score: 0,
            value_explanation: "",
            manager_score: 0,
            manager_feedback: "",
            manager_recommendations: recs ?? [],
          } as EvaluationDetail;
        }
        return {
          ...prev,
          manager_recommendations: recs ?? prev.manager_recommendations,
        };
      });
    } catch (error) {
      console.error("Failed to generate recommendations:", error);
      alert("Не удалось сформировать рекомендации");
    } finally {
      setIsGeneratingRecommendations(false);
    }
  };

  const handleRestartAnalysis = async () => {
    if (!call || restarting) return;

    try {
      setRestarting(true);

      // Шаг 1: Транскрипция с выбранной моделью
      const transcribeResponse = await restPost<{ success?: boolean }>(
        `/calls/${id}/transcribe?model=${selectedModel}`,
      );

      if (!transcribeResponse?.success) {
        throw new Error("Transcription failed");
      }

      // Шаг 2: Переоценка звонка
      try {
        await restPost(`/calls/${id}/evaluate`);
        console.log("Evaluation completed");
      } catch (evalError) {
        console.warn(
          "Evaluation failed, but transcription succeeded:",
          evalError,
        );
        // Продолжаем даже если оценка не удалась
      }

      // Шаг 3: Обновляем данные на странице
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

  if (loading)
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>Загрузка...</div>
    );
  if (!call)
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        Звонок не найден
      </div>
    );

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
    <div className="app-container">
      <Sidebar user={user} />
      <Header user={user} />

      <main className="main-content">
        <div className="call-meta-header">
          <div className="call-title-row">
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
                    src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/records/${call.filename}`}
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
                    style={{ width: `${(evaluation?.value_score || 0) * 20}%` }}
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
                    style={{ fontSize: "13px", color: "#666", lineHeight: 1.6 }}
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
                <p
                  style={{
                    fontSize: "13px",
                    color: "#856404",
                    fontStyle: "italic",
                    margin: 0,
                  }}
                >
                  Нажмите «Сформировать», чтобы получить рекомендации с учётом
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
      </main>
    </div>
  );
}
