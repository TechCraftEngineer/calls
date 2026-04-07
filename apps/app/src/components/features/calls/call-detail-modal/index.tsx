"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Separator,
  toast,
} from "@calls/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Loader2, Phone, Trash2, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { restartCallAnalysis } from "@/lib/restart-analysis";
import { client, useORPC } from "@/orpc/react";
import DeleteConfirmModal from "./delete-confirm-modal";
import EvaluationSidebar from "./evaluation-sidebar";
import TranscriptSection from "./transcript-section";
import type { CallDetail, CallDetailModalProps, EvaluationDetail, TranscriptDetail } from "./types";

export default function CallDetailModal({ callId, onClose, onCallDeleted }: CallDetailModalProps) {
  const orpc = useORPC();
  const [evaluation, setEvaluation] = useState<EvaluationDetail | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [downloadingRecording, setDownloadingRecording] = useState(false);

  // Валидация UUID v7 формата
  const isValidCallId = (id: string | number): boolean => {
    if (!id) return false;
    const idStr = String(id);
    // UUID v7 с префиксом ws_ или обычный UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
  const call = result?.call && typeof result.call === "object" ? (result.call as CallDetail) : null;
  const transcript =
    result?.transcript && typeof result.transcript === "object"
      ? (result.transcript as TranscriptDetail)
      : null;

  useEffect(() => {
    setEvaluation((result?.evaluation ?? null) as EvaluationDetail | null);
  }, [result?.evaluation]);

  const transcribeMutation = useMutation(orpc.calls.transcribe.mutationOptions());

  const generateRecommendationsMutation = useMutation(
    orpc.calls.generateRecommendations.mutationOptions({
      onSuccess: (data) => {
        const recs = (data as { recommendations?: string[] })?.recommendations ?? [];
        setEvaluation((prev) => {
          if (!prev) {
            return {
              id: "",
              valueScore: 0,
              valueExplanation: "",
              managerScore: 0,
              managerFeedback: "",
              managerRecommendations: recs,
            } as EvaluationDetail;
          }
          return { ...prev, managerRecommendations: recs };
        });
      },
      onError: (error) => {
        const errorMessage =
          error instanceof Error ? error.message : "Не удалось сформировать рекомендации";
        toast.error(`Ошибка: ${errorMessage}`);
      },
    }),
  );

  const evaluateMutation = useMutation(
    orpc.calls.evaluate.mutationOptions({
      onSuccess: () => {
        toast.success("Оценка запущена. Данные обновятся через несколько секунд.");
        setTimeout(() => void loadData(), 6000);
      },
      onError: (error) => {
        const errorMessage = error instanceof Error ? error.message : "Не удалось запустить оценку";
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
        const errorMessage = error instanceof Error ? error.message : "Ошибка при удалении звонка";
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
    
    const speakerMapping = transcript?.speakerMapping;
    const processedText = transcript.text
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        const parts = line.split(":");
        if (parts.length >= 2) {
          const rawSpeaker = parts[0].trim().replace(/\*\*/g, "");
          const mappedSpeaker = speakerMapping?.[rawSpeaker] ?? rawSpeaker;
          const text = parts.slice(1).join(":").trim();
          return `${mappedSpeaker}: ${text}`;
        }
        return line;
      })
      .join("\n");
    
    const element = document.createElement("a");
    const file = new Blob([processedText], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `call_${call?.number || callId}_transcript.txt`;
    document.body.appendChild(element);
    element.click();
  };

  const handleDownloadRecording = async () => {
    if (!call?.fileId || downloadingRecording) return;

    try {
      setDownloadingRecording(true);

      // Получаем presigned URL из S3 через ORPC клиент
      const result = await client.calls.getPlaybackUrl({ call_id: callIdStr });

      if (!result?.url) {
        toast.error("URL записи недоступен");
        return;
      }

      // Прямое скачивание с S3 через ссылку
      const element = document.createElement("a");
      element.href = result.url;
      element.download = `call_${call.number || callId}_recording.mp3`;
      element.target = "_blank";
      element.rel = "noopener noreferrer";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast.success("Скачивание начато");
    } catch (error) {
      console.error("Failed to download recording:", error);
      const errorMessage = error instanceof Error ? error.message : "Ошибка при скачивании записи";
      toast.error(`Ошибка: ${errorMessage}`);
    } finally {
      setDownloadingRecording(false);
    }
  };

  const handleRestartAnalysis = async () => {
    if (!call || restarting) return;
    try {
      setRestarting(true);
      await restartCallAnalysis({
        callId: callIdStr,
        transcribe: async (input) => {
          await transcribeMutation.mutateAsync(input);
        },
        loadData: () => loadData().then(() => {}),
      });
      toast.success("Анализ успешно перезапущен!");
    } catch (error: unknown) {
      console.error("Failed to restart analysis:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Ошибка при перезапуске анализа";
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
  const isWorkspaceAdmin = activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";

  const handleDeleteCall = useCallback(() => {
    if (!call || deleteMutation.isPending) return;
    deleteMutation.mutate({ call_id: callIdStr });
  }, [call, callIdStr, deleteMutation]);

  const isOpen = !!callId;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto p-0 gap-0 text-left sm:max-w-[1400px]"
          showCloseButton={true}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="text-muted-foreground size-8 animate-spin" />
              <p className="text-muted-foreground text-sm">Загрузка...</p>
            </div>
          ) : !call ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Phone className="text-muted-foreground size-10 opacity-50" />
              <p className="text-muted-foreground text-sm">Звонок не найден</p>
            </div>
          ) : (
            <>
              <DialogHeader className="space-y-1.5 px-6 pt-6 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-4 pr-8">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <DialogTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                      {call.number}
                    </DialogTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="font-medium">
                        {call.direction === "inbound" ? "Входящий" : "Исходящий"}
                      </Badge>
                      <Badge
                        variant={(call.duration ?? 0) > 0 ? "outline" : "destructive"}
                        className={
                          (call.duration ?? 0) > 0
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                            : undefined
                        }
                      >
                        {(call.duration ?? 0) > 0 ? "Завершён" : "Пропущен"}
                      </Badge>
                    </div>
                  </div>
                  {isWorkspaceAdmin && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={deleteMutation.isPending}
                      title="Удалить звонок"
                      className="gap-1.5"
                    >
                      <Trash2 className="size-4" />
                      {deleteMutation.isPending ? "Удаление..." : "Удалить"}
                    </Button>
                  )}
                </div>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    {new Date(call.timestamp).toLocaleDateString("ru-RU")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {new Date(call.timestamp).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>{Math.round(call.duration ?? 0)} с</span>
                  <span className="flex items-center gap-1.5">
                    <User className="size-3.5" />
                    {call.managerName || call.operatorName || "—"}
                  </span>
                </div>
              </DialogHeader>
              <Separator />
              <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_340px]">
                <TranscriptSection
                  callId={callIdStr}
                  transcript={transcript}
                  onDownloadTxt={handleDownloadTxt}
                  onDownloadRecording={call.fileId ? handleDownloadRecording : undefined}
                  downloadingRecording={downloadingRecording}
                  managerName={call.managerName ?? call.operatorName ?? undefined}
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
                  isGeneratingRecommendations={generateRecommendationsMutation.isPending}
                />
              </div>
            </>
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
