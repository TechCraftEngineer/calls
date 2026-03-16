"use client";

import { Badge, Button, Dialog, DialogContent, toast } from "@calls/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { restartCallAnalysis } from "@/lib/restart-analysis";
import { useORPC } from "@/orpc/react";
import DeleteConfirmModal from "./delete-confirm-modal";
import EvaluationSidebar from "./evaluation-sidebar";
import TranscriptSection from "./transcript-section";
import type {
  CallDetail,
  CallDetailModalProps,
  EvaluationDetail,
  TranscriptDetail,
} from "./types";

export default function CallDetailModal({
  callId,
  onClose,
  onCallDeleted,
}: CallDetailModalProps) {
  const orpc = useORPC();
  const [evaluation, setEvaluation] = useState<EvaluationDetail | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  // Валидация UUID v7 формата
  const isValidCallId = (id: string | number): boolean => {
    if (!id) return false;
    const idStr = String(id);
    // UUID v7 с префиксом ws_ или обычный UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const uuidWithPrefixRegex =
      /^ws_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(idStr) || uuidWithPrefixRegex.test(idStr);
  };

  const callIdStr = isValidCallId(callId) ? String(callId) : "";
  const {
    data: result,
    isPending: loading,
    refetch: loadData,
  } = useQuery({
    ...orpc.calls.get.queryOptions({ input: { call_id: callIdStr } }),
    enabled: !!callIdStr,
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

  useEffect(() => {
    setEvaluation((result?.evaluation ?? null) as EvaluationDetail | null);
  }, [result?.evaluation]);

  useEffect(() => {
    const t = result?.transcript as TranscriptDetail | null;
    if (!t?.raw_text) setShowRaw(false);
  }, [result?.transcript]);

  const generateRecommendationsMutation = useMutation(
    orpc.calls.generateRecommendations.mutationOptions({
      onSuccess: (data) => {
        const recs =
          (data as { recommendations?: string[] })?.recommendations ?? [];
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
        setTimeout(() => void loadData(), 6000);
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

  const deleteMutation = useMutation(
    orpc.calls.delete.mutationOptions({
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onCallDeleted?.(callId);
        onClose();
        toast.success("Звонок удалён");
      },
      onError: (error) => {
        const errorMessage =
          error instanceof Error ? error.message : "Ошибка при удалении звонка";
        toast.error(`Ошибка: ${errorMessage}`);
      },
    }),
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDeleteConfirm) setShowDeleteConfirm(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, showDeleteConfirm]);

  const handleGenerateRecommendations = () => {
    if (!callIdStr || generateRecommendationsMutation.isPending) return;

    // Дополнительная защита от race condition
    if (generateRecommendationsMutation.variables?.call_id === callIdStr) {
      return;
    }

    generateRecommendationsMutation.mutate({ call_id: callIdStr });
  };

  const handleDownloadTxt = () => {
    if (!transcript?.text) return;
    const element = document.createElement("a");
    const file = new Blob([transcript.text], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `call_${call?.number || callId}_transcript.txt`;
    document.body.appendChild(element);
    element.click();
  };

  const handleRestartAnalysis = async () => {
    if (!call || restarting) return;
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
    if (!callIdStr || evaluateMutation.isPending) return;

    // Дополнительная защита от race condition
    if (evaluateMutation.variables?.call_id === callIdStr) {
      return;
    }

    evaluateMutation.mutate({ call_id: callIdStr });
  };

  const { activeWorkspace } = useWorkspace();
  const isWorkspaceAdmin =
    activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";

  const handleDeleteCall = useCallback(() => {
    if (!call || deleteMutation.isPending) return;
    deleteMutation.mutate({ call_id: callIdStr });
  }, [call, callIdStr, deleteMutation]);

  const isOpen = !!callId;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="max-w-[1400px] max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto p-0 gap-0 text-left"
          showCloseButton={true}
        >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-muted-foreground">Загрузка...</p>
            </div>
          ) : !call ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-muted-foreground">Звонок не найден</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-8">
                <div className="flex flex-wrap items-center justify-between gap-4 pr-10">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-foreground text-3xl font-extrabold tracking-tight">
                      {call.number}
                    </span>
                    <Badge variant="secondary">
                      {call.direction === "incoming" ? "ВХОДЯЩИЙ" : "ИСХОДЯЩИЙ"}
                    </Badge>
                    <Badge
                      variant={
                        (call.duration ?? 0) > 0 ? "outline" : "destructive"
                      }
                      className={
                        (call.duration ?? 0) > 0
                          ? "border-green-500/30 bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                          : undefined
                      }
                    >
                      {(call.duration ?? 0) > 0 ? "ЗАВЕРШЁН" : "ПРОПУЩЕН"}
                    </Badge>
                  </div>
                  {isWorkspaceAdmin && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={deleteMutation.isPending}
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
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      {deleteMutation.isPending ? "Удаление..." : "Удалить"}
                    </Button>
                  )}
                </div>
                <div className="text-muted-foreground mt-3 flex flex-wrap gap-6 text-sm font-medium">
                  <span>
                    📅 {new Date(call.timestamp).toLocaleDateString()}
                  </span>
                  <span>
                    ⏰{" "}
                    {new Date(call.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>⏱️ {Math.round(call.duration ?? 0)}с</span>
                  <span>
                    👤 {call.manager_name || call.operator_name || "—"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
                <TranscriptSection
                  transcript={transcript}
                  showRaw={showRaw}
                  onShowRawChange={setShowRaw}
                  onDownloadTxt={handleDownloadTxt}
                  managerName={call.manager_name}
                />
                <EvaluationSidebar
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showDeleteConfirm && call && (
        <DeleteConfirmModal
          call={call}
          deleting={deleteMutation.isPending}
          onConfirm={handleDeleteCall}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
