"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
} from "@calls/ui";
import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { useToast } from "@/components/ui/toast";
import api from "@/lib/api";
import { restartCallAnalysis } from "@/lib/restart-analysis";
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
  const { showToast } = useToast();
  const [call, setCall] = useState<CallDetail | null>(null);
  const [transcript, setTranscript] = useState<TranscriptDetail | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] =
    useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.calls.get({ call_id: callId });
      setCall(result.call as CallDetail);
      setTranscript((result.transcript ?? null) as TranscriptDetail | null);
      setEvaluation((result.evaluation ?? null) as EvaluationDetail | null);
      const t = result.transcript as TranscriptDetail | null;
      if (!t?.raw_text) setShowRaw(false);
    } catch (error) {
      console.error("Failed to load call detail:", error);
    } finally {
      setLoading(false);
    }
  }, [callId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      showToast("Не удалось сформировать рекомендации", "error");
    } finally {
      setIsGeneratingRecommendations(false);
    }
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
      await restartCallAnalysis({ callId, loadData });
      showToast("Анализ успешно перезапущен!", "success");
    } catch (error: unknown) {
      console.error("Failed to restart analysis:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Ошибка при перезапуске анализа";
      showToast(`Ошибка: ${errorMessage}`, "error");
    } finally {
      setRestarting(false);
    }
  };

  const { activeWorkspace } = useWorkspace();
  const isWorkspaceAdmin =
    activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";

  const handleDeleteCall = useCallback(async () => {
    if (!call || deleting) return;
    try {
      setDeleting(true);
      await api.calls.delete({ call_id: callId });
      setShowDeleteConfirm(false);
      onCallDeleted?.(callId);
      onClose();
    } catch (error: unknown) {
      console.error("Failed to delete call:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Ошибка при удалении звонка";
      showToast(`Ошибка: ${errorMessage}`, "error");
    } finally {
      setDeleting(false);
    }
  }, [call, callId, deleting, onCallDeleted, onClose, showToast]);

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
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      {deleting ? "Удаление..." : "Удалить"}
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
                  onRestartAnalysis={handleRestartAnalysis}
                  onGenerateRecommendations={handleGenerateRecommendations}
                  isGeneratingRecommendations={isGeneratingRecommendations}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showDeleteConfirm && call && (
        <DeleteConfirmModal
          call={call}
          deleting={deleting}
          onConfirm={handleDeleteCall}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
