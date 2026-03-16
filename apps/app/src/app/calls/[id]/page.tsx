"use client";

import { paths } from "@calls/config";
import { toast } from "@calls/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CallMetaHeader from "@/components/features/calls/call-meta-header";
import CallSidebar from "@/components/features/calls/call-sidebar";
import { TranscriptCard } from "@/components/features/calls/transcript-card";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { getCurrentUser, type User } from "@/lib/auth";
import { restartCallAnalysis } from "@/lib/restart-analysis";
import { useORPC } from "@/orpc/react";
import type {
  CallDetail,
  EvaluationDetail,
  TranscriptDetail,
} from "@/types/calls";

export default function CallDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const orpc = useORPC();
  const [user, setUser] = useState<User | null>(null);
  const [restarting, setRestarting] = useState(false);

  // Валидация UUID v7 формата (ws_123456 или UUID)
  const isValidCallId = (id: string): boolean => {
    if (!id || typeof id !== "string") return false;
    // UUID v7 с префиксом ws_ или обычный UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const uuidWithPrefixRegex =
      /^ws_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id) || uuidWithPrefixRegex.test(id);
  };

  const rawCallId = Array.isArray(id) ? id[0] : (id ?? "");
  const callId = isValidCallId(rawCallId) ? rawCallId : "";

  const {
    data: result,
    isPending: loading,
    error: callError,
    refetch: loadData,
  } = useQuery({
    ...orpc.calls.get.queryOptions({ input: { call_id: callId } }),
    enabled: !!callId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });

  // Безопасное приведение типов с проверкой структуры
  const call =
    result?.call && typeof result.call === "object"
      ? (result.call as CallDetail)
      : null;
  const transcript =
    result?.transcript && typeof result.transcript === "object"
      ? (result.transcript as TranscriptDetail)
      : null;
  const [evaluation, setEvaluation] = useState<EvaluationDetail | null>(null);

  useEffect(() => {
    if (result?.evaluation) {
      setEvaluation((result.evaluation ?? null) as EvaluationDetail | null);
    }
  }, [result?.evaluation]);

  const generateRecommendationsMutation = useMutation(
    orpc.calls.generateRecommendations.mutationOptions({
      onSuccess: (data) => {
        const recs = (data as { recommendations?: string[] })?.recommendations;
        setEvaluation((prev) => {
          if (!prev) {
            return {
              id: "",
              valueScore: 0,
              valueExplanation: "",
              managerScore: 0,
              managerFeedback: "",
              managerRecommendations: recs ?? [],
            } as EvaluationDetail;
          }
          return {
            ...prev,
            managerRecommendations: recs ?? prev.managerRecommendations,
          };
        });
      },
      onError: (error) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Не удалось сформировать рекомендации";
        toast.error(`Ошибка: ${errorMessage}`);
      },
    }),
  );

  const evaluateMutation = useMutation(
    orpc.calls.evaluate.mutationOptions({
      onSuccess: () => {
        toast.success(
          "Оценка запущена. Данные обновятся через несколько секунд.",
        );
        setTimeout(() => loadData(), 6000);
      },
      onError: (error) => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Не удалось запустить оценку";
        toast.error(`Ошибка: ${errorMessage}`);
      },
    }),
  );

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  useEffect(() => {
    if (callError && typeof callError === "object" && "code" in callError) {
      if ((callError as { code?: string }).code === "UNAUTHORIZED") {
        router.push(paths.auth.signin);
      }
    }
  }, [callError, router]);

  const handleGenerateRecommendations = () => {
    if (!callId || generateRecommendationsMutation.isPending) return;

    // Дополнительная защита от race condition
    if (generateRecommendationsMutation.variables?.call_id === callId) {
      return;
    }

    generateRecommendationsMutation.mutate({ call_id: callId });
  };

  const handleRestartAnalysis = async () => {
    if (!call || !callId || restarting) return;
    try {
      setRestarting(true);
      await restartCallAnalysis({
        callId,
        loadData: () => loadData().then(() => {}),
      });
      toast.success("Анализ успешно перезапущен!");
    } catch (error: unknown) {
      console.error("Failed to restart analysis:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Ошибка при перезапуске анализа";
      toast.error(`Ошибка: ${errorMessage}`);
    } finally {
      setRestarting(false);
    }
  };

  const handleReevaluate = () => {
    if (!callId || evaluateMutation.isPending) return;

    // Дополнительная защита от race condition
    if (evaluateMutation.variables?.call_id === callId) {
      return;
    }

    evaluateMutation.mutate({ call_id: callId });
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
            restarting={restarting}
            reevaluating={evaluateMutation.isPending}
            onRestartAnalysis={handleRestartAnalysis}
            onReevaluate={handleReevaluate}
            onGenerateRecommendations={handleGenerateRecommendations}
            isGeneratingRecommendations={
              generateRecommendationsMutation.isPending
            }
          />
        </div>
      </main>
    </div>
  );
}
