"use client";

import { paths } from "@calls/config";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import CallMetaHeader from "@/components/features/calls/call-meta-header";
import TranscriptPanel from "@/components/features/calls/transcript-panel";
import CallSidebar from "@/components/features/calls/call-sidebar";
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
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
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

        return { speaker, text: formattedText, isOperator: !!isOperator };
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

  const handleGenerateRecommendations = async () => {
    if (!id || isGeneratingRecommendations) return;
    try {
      setIsGeneratingRecommendations(true);
      const result = await api.calls.generateRecommendations({ call_id: Number(id) });
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
        return { ...prev, manager_recommendations: recs ?? prev.manager_recommendations };
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
      } catch (evalError) {
        console.warn("Evaluation failed, but transcription succeeded:", evalError);
      }

      // Шаг 3: Обновляем данные на странице
      await loadData();
      alert("Анализ успешно перезапущен!");
    } catch (error: unknown) {
      console.error("Failed to restart analysis:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Ошибка при перезапуске анализа";
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

  return (
    <div className="app-container">
      <Sidebar user={user} />
      <Header user={user} />

      <main className="main-content">
        <CallMetaHeader call={call} />

        <div className="detail-grid">
          <TranscriptPanel
            messages={messages}
            hasRawText={!!transcript?.raw_text}
            showRaw={showRaw}
            onToggleRaw={setShowRaw}
            onDownload={handleDownloadTxt}
          />

          <CallSidebar
            call={call}
            transcript={transcript}
            evaluation={evaluation}
            selectedModel={selectedModel}
            restarting={restarting}
            isGeneratingRecommendations={isGeneratingRecommendations}
            onModelChange={setSelectedModel}
            onRestartAnalysis={handleRestartAnalysis}
            onGenerateRecommendations={handleGenerateRecommendations}
          />
        </div>
      </main>
    </div>
  );
}
