"use client";

import { Button } from "@calls/ui";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const [selectedModel, setSelectedModel] = useState("assemblyai");
  const [restarting, setRestarting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] =
    useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

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
      await restartCallAnalysis({ callId, model: selectedModel, loadData });
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

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current && !showDeleteConfirm) onClose();
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="modal-close-btn absolute top-6 right-6 z-10"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </Button>
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
              {isWorkspaceAdmin && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="ml-auto"
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
              selectedModel={selectedModel}
              restarting={restarting}
              onModelChange={setSelectedModel}
              onRestartAnalysis={handleRestartAnalysis}
              onGenerateRecommendations={handleGenerateRecommendations}
              isGeneratingRecommendations={isGeneratingRecommendations}
            />
          </div>
        </div>
      </div>
      {showDeleteConfirm && (
        <DeleteConfirmModal
          call={call}
          deleting={deleting}
          onConfirm={handleDeleteCall}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
