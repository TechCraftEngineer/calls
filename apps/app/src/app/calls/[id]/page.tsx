"use client";

import { paths } from "@calls/config";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@calls/ui";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import sanitizeHtml from "sanitize-html";
import AudioPlayer from "@/components/ui/audio-player";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import api, { restPost } from "@/lib/api";
import { getCurrentUser, type User } from "@/lib/auth";

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
        router.push(paths.auth.signin);
        return;
      }
      setUser(currentUser);

      const result = await api.calls.get({ call_id: Number(id) });
      setCall(result.call as CallDetail);
      setTranscript((result.transcript ?? null) as TranscriptDetail | null);
      setEvaluation((result.evaluation ?? null) as EvaluationDetail | null);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "UNAUTHORIZED"
      ) {
        router.push(paths.auth.signin);
      }
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
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
      <div className="app-container">
        <Sidebar user={user} />
        <Header user={user} />
        <main className="main-content flex items-center justify-center min-h-[200px]">
          <div className="text-[#666]">Загрузка…</div>
        </main>
      </div>
    );
  if (!call)
    return (
      <div className="app-container">
        <Sidebar user={user} />
        <Header user={user} />
        <main className="main-content flex items-center justify-center min-h-[200px]">
          <div className="text-[#666]">Звонок не найден</div>
        </main>
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
            <Badge
              variant="secondary"
              className="bg-[#F5F5F7] text-[#888] border-0 font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded"
            >
              {call.direction === "incoming" ? "ВХОДЯЩИЙ" : "ИСХОДЯЩИЙ"}
            </Badge>
            <Badge
              variant={isCompleted ? "default" : "destructive"}
              className={cn(
                "font-bold text-[11px] uppercase tracking-wider px-3 py-1 rounded",
                isCompleted && "status-success",
              )}
            >
              {isCompleted ? "ЗАВЕРШЁН" : "ПРОПУЩЕН"}
            </Badge>
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
          <Card className="transcript-card p-0! gap-0! py-0!">
            <CardHeader className="transcript-header flex flex-row justify-between items-center mb-4 pb-4 border-b border-[#EEE] px-6 pt-5">
              <div className="flex items-center gap-3">
                <CardTitle className="m-0 text-base font-bold flex items-center gap-2">
                  <span className="text-lg">💬</span> Расшифровка
                </CardTitle>

                {transcript?.raw_text && (
                  <Tabs
                    value={showRaw ? "raw" : "processed"}
                    onValueChange={(v) => setShowRaw(v === "raw")}
                  >
                    <TabsList className="bg-[#F0F0F0] p-0.5 rounded-md ml-2 h-auto">
                      <TabsTrigger
                        value="processed"
                        className="data-[state=active]:bg-white data-[state=active]:text-[#111] data-[state=active]:font-semibold data-[state=active]:shadow-sm text-[#666] px-2.5 py-1 text-[11px] rounded"
                      >
                        Обработка
                      </TabsTrigger>
                      <TabsTrigger
                        value="raw"
                        className="data-[state=active]:bg-white data-[state=active]:text-[#111] data-[state=active]:font-semibold data-[state=active]:shadow-sm text-[#666] px-2.5 py-1 text-[11px] rounded"
                      >
                        Оригинал
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </div>

              <Button
                variant="ghost"
                className="ghost-btn h-8 text-xs px-3"
                onClick={handleDownloadTxt}
              >
                <span>📥</span> Скачать .txt
              </Button>
            </CardHeader>

            <CardContent className="message-list p-6 overflow-y-auto flex-1 flex flex-col gap-4 bg-[#FAFAFA]">
              {messages.length > 0 ? (
                messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "message-item flex gap-3 max-w-[85%]",
                      m.isOperator && "self-start",
                    )}
                  >
                    <Avatar className="size-8 shrink-0 rounded-full bg-[#EEE]">
                      <AvatarFallback className="bg-[#EEE] text-[#999] text-xs font-bold">
                        {m.speaker.includes("АВТООТВЕТЧИК")
                          ? "🤖"
                          : m.speaker[0]?.toUpperCase() || "👤"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="message-content flex flex-col gap-1">
                      <div className="speaker-name-sm">{m.speaker}</div>
                      <div
                        className="speech-bubble"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(m.text, {
                            allowedTags: ["b", "i", "em", "strong", "br", "p"],
                            allowedAttributes: {},
                            disallowedTagsMode: "discard",
                          }),
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-[#999]">
                  Текст отсутствует
                </div>
              )}
            </CardContent>
          </Card>

          <div className="info-sidebar">
            <Card className="sidebar-card">
              <CardHeader className="px-6 pt-6 pb-0">
                <CardTitle className="sidebar-card-title">
                  🎵 ЗАПИСЬ ЗВОНКА
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-4">
                <div className="audio-player-container">
                  {call.filename ? (
                    <AudioPlayer
                      src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:7000"}/api/records/${call.filename}`}
                    />
                  ) : (
                    <div className="text-[13px] text-[#999]">
                      Файл записи не найден
                    </div>
                  )}
                </div>
                <div className="mt-3 text-xs text-[#999]">
                  Размер файла: {formatFileSize(call.size_bytes)}
                </div>
              </CardContent>
            </Card>

            <Card className="sidebar-card">
              <CardContent className="p-4">
                <div
                  className={cn(
                    "text-lg font-bold",
                    call.customer_name ? "text-[#111]" : "text-[#999]",
                  )}
                >
                  {call.customer_name
                    ? `Абонент: ${call.customer_name}`
                    : "Имя: не определено"}
                </div>
              </CardContent>
            </Card>

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
              </CardContent>
            </Card>

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
                  onClick={handleGenerateRecommendations}
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

            <Card className="sidebar-card">
              <CardHeader className="px-6 pt-6 pb-0">
                <CardTitle className="sidebar-card-title">📋 РЕЗЮМЕ</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-4">
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
                <Separator className="my-4 bg-[#eee]" />
                <p className="text-[13px] text-[#666] leading-relaxed mb-5">
                  {transcript?.summary || "Резюме отсутствует"}
                </p>
                <div className="flex gap-2 items-center mb-3">
                  <label className="text-xs text-[#666] whitespace-nowrap">
                    Модель:
                  </label>
                  <Select
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                    disabled={restarting}
                  >
                    <SelectTrigger
                      className="flex-1 h-8 text-xs border-[#ddd] bg-white disabled:bg-[#f5f5f5]"
                      size="sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assemblyai">AssemblyAI</SelectItem>
                      <SelectItem value="salutespeech">SaluteSpeech</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  className="ghost-btn w-full text-xs h-9 gap-2 disabled:opacity-60"
                  onClick={handleRestartAnalysis}
                  disabled={restarting}
                >
                  <span className="text-sm">🔄</span>
                  {restarting ? "Перезапуск…" : "Перезапустить анализ"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
