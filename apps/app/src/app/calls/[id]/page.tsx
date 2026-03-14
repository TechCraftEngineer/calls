"use client";

import { paths } from "@calls/config";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CallMetaHeader from "@/components/features/calls/call-meta-header";
import CallSidebar from "@/components/features/calls/call-sidebar";
import { TranscriptCard } from "@/components/features/calls/transcript-card";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import api, { restPost } from "@/lib/api";
import { getCurrentUser, type User } from "@/lib/auth";
import type {
  CallDetail,
  EvaluationDetail,
  TranscriptDetail,
} from "@/types/calls";

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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push(paths.auth.signin);
        return;
      }
      setUser(currentUser);

      const callId = Array.isArray(id) ? id[0] : id;
      if (!callId) return;
      const result = await api.calls.get({ call_id: callId });
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

  const handleGenerateRecommendations = async () => {
    const callId = Array.isArray(id) ? id[0] : id;
    if (!callId || isGeneratingRecommendations) return;
    try {
      setIsGeneratingRecommendations(true);
      const result = await api.calls.generateRecommendations({
        call_id: callId,
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
    const callId = Array.isArray(id) ? id[0] : id;
    if (!call || !callId || restarting) return;
    try {
      setRestarting(true);

      // Шаг 1: Транскрипция с выбранной моделью
      const transcribeResponse = await restPost<{ success?: boolean }>(
        `/calls/${callId}/transcribe?model=${selectedModel}`,
      );

      if (!transcribeResponse?.success) {
        throw new Error("Transcription failed");
      }

      // Шаг 2: Переоценка звонка
      try {
        await restPost(`/calls/${callId}/evaluate`);
      } catch (evalError) {
        console.warn(
          "Evaluation failed, but transcription succeeded:",
          evalError,
        );
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

  return (
    <div className="app-container">
      <Sidebar user={user} />
      <Header user={user} />

      <main className="main-content">
        <CallMetaHeader call={call} />

        <div className="detail-grid">
          <TranscriptCard call={call} transcript={transcript} />

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
