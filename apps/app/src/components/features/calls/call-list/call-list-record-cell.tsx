"use client";

import { Button } from "@calls/ui";
import type { CallWithDetails } from "./types";

interface RecordColumnCellProps {
  item: CallWithDetails;
  onGenerateRecommendations: (
    callId: string,
    existingRecommendations?: string[],
  ) => void;
  onTranscribe?: (callId: string) => void;
  onPlay?: (callId: string, number: string) => void;
  isLoadingRecommendations: boolean;
  recommendationsCallId: string | null;
}

function RecommendationsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: "#F7931E" }}
    >
      <path
        d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.22-1.21 4.15-3 5.19V17H9v-2.81c-1.79-1.04-3-2.97-3-5.19a6 6 0 0 1 6-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function TranscribeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color: "#666" }}
    >
      <path
        d="M12 2a3 3 0 0 1 3 3v12a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M19 10v4a7 7 0 0 1-14 0v-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ marginLeft: "2px" }}
    >
      <path d="M8 5 L8 19 L19 12 Z" fill="currentColor" />
    </svg>
  );
}

export function RecordColumnCell({
  item,
  onGenerateRecommendations,
  onTranscribe,
  onPlay,
  isLoadingRecommendations,
  recommendationsCallId,
}: RecordColumnCellProps) {
  const { call, evaluation } = item;

  if (!call.filename) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      />
    );
  }

  const isRecommendationsLoading =
    isLoadingRecommendations && recommendationsCallId === call.id;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onGenerateRecommendations(
            call.id,
            evaluation?.managerRecommendations ?? undefined,
          );
        }}
        disabled={isRecommendationsLoading}
        title="Сформировать рекомендации"
        aria-label="Сформировать рекомендации по звонку"
        className="size-6 min-w-6 p-0"
      >
        {isRecommendationsLoading ? (
          <div
            style={{
              width: "14px",
              height: "14px",
              border: "2px solid #f0f0f0",
              borderTop: "2px solid #F7931E",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        ) : (
          <RecommendationsIcon />
        )}
      </Button>
      {onTranscribe && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTranscribe(call.id);
          }}
          title="Запустить транскрипцию"
          aria-label="Запустить транскрипцию звонка"
          className="size-6 min-w-6 p-0"
        >
          <TranscribeIcon />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="record-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onPlay && call.filename) {
            onPlay(String(call.id), call.number || "");
          }
        }}
        title="Прослушать запись"
        aria-label="Прослушать запись звонка"
      >
        <PlayIcon />
      </Button>
    </div>
  );
}
