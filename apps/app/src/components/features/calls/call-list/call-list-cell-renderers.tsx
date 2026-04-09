"use client";

import { paths } from "@calls/config";
import { Button, Rating, Tooltip, TooltipContent, TooltipTrigger } from "@calls/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import * as React from "react";
import { isMobileDevice } from "@/lib/utils";
import { formatDuration, formatTimestamp } from "./call-list-cells";
import type { CallWithDetails } from "./types";

const linkButtonStyle = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  textDecoration: "none",
  color: "inherit",
  font: "inherit",
} as const;

export function createLinkOrButton(
  onSelectCall: (callId: string) => void,
): (item: CallWithDetails, content: ReactNode, extraStyle?: object) => ReactNode {
  return (item, content, extraStyle) => {
    const { call } = item;
    return isMobileDevice() ? (
      <Link
        href={paths.calls.call(call.id)}
        className="call-link"
        style={{ ...linkButtonStyle, ...extraStyle } as object}
      >
        {content}
      </Link>
    ) : (
      <Button
        type="button"
        variant="link"
        onClick={() => onSelectCall(call.id)}
        className="call-link h-auto p-0 font-inherit"
        style={{ ...linkButtonStyle, ...extraStyle } as object}
      >
        {content}
      </Button>
    );
  };
}

export function renderDirectionCell(call: CallWithDetails["call"]) {
  const directionLabel = call.direction === "inbound" ? "ВХОДЯЩИЙ" : "ИСХОДЯЩИЙ";
  const directionClass = directionLabel === "ВХОДЯЩИЙ" ? "badge-yellow-op" : "badge-black-op";
  return <span className={`op-badge ${directionClass}`}>{directionLabel}</span>;
}

function CallTooltipCell({ title, children }: { title: string; children: ReactNode }) {
  const id = React.useId();
  const labelId = `${id}-label`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="block min-w-0 max-w-full truncate cursor-default text-[#555] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span id={labelId} className="sr-only">
            {title}:{" "}
          </span>
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-md max-h-80 overflow-y-auto whitespace-pre-wrap text-left"
      >
        <div className="font-medium mb-1">{title}</div>
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

export function renderCallTypeCell(transcript: CallWithDetails["transcript"]) {
  const callType = transcript?.callType?.trim();
  if (!callType) {
    return <span style={{ color: "#ccc" }}>—</span>;
  }

  return <CallTooltipCell title="Тип звонка">{callType}</CallTooltipCell>;
}

export function renderManagerNameCell(call: CallWithDetails["call"]) {
  const managerName = call.managerName?.trim() || call.operatorName?.trim();
  if (!managerName) {
    return <span style={{ color: "#ccc" }}>—</span>;
  }

  return <CallTooltipCell title="Менеджер">{managerName}</CallTooltipCell>;
}

export function renderCallTopicCell(transcript: CallWithDetails["transcript"]) {
  const callTopic = transcript?.callTopic?.trim();
  if (!callTopic) {
    return <span style={{ color: "#ccc" }}>—</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="block min-h-[24px] min-w-[24px] max-w-full truncate cursor-default bg-transparent border-0 p-1 text-[#555] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-[44px] md:min-w-[44px]"
        >
          {callTopic}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-md max-h-80 overflow-y-auto whitespace-pre-wrap text-left"
      >
        <div className="font-medium mb-1">Тема звонка</div>
        {callTopic}
      </TooltipContent>
    </Tooltip>
  );
}

export function renderSentimentCell(transcript: CallWithDetails["transcript"]) {
  const sentiment = transcript?.sentiment?.trim();
  if (!sentiment) {
    return <span style={{ color: "#ccc" }}>—</span>;
  }

  const normalized = sentiment.toLowerCase();
  const label =
    normalized.includes("pos") || normalized.includes("поз")
      ? "Позитивная"
      : normalized.includes("neg") || normalized.includes("нег")
        ? "Негативная"
        : normalized.includes("neutral") || normalized.includes("нейтр")
          ? "Нейтральная"
          : "Неизвестная тональность";
  const color =
    normalized.includes("neg") || normalized.includes("нег")
      ? "#b42318"
      : normalized.includes("pos") || normalized.includes("поз")
        ? "#067647"
        : "#555";

  return <span style={{ color, fontWeight: 600 }}>{label}</span>;
}

export function renderNumberCell(
  item: CallWithDetails,
  renderLinkOrButton: (item: CallWithDetails, content: ReactNode, extraStyle?: object) => ReactNode,
) {
  const { call } = item;
  return call.customerName ? (
    <>
      {renderLinkOrButton(item, call.customerName, {
        fontSize: "15px",
        fontWeight: 700,
        display: "block",
        marginBottom: "4px",
      })}
      <div style={{ fontSize: "11px", color: "#999" }}>{call.number || ""}</div>
    </>
  ) : (
    <>
      {renderLinkOrButton(item, call.number)}
      <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>
        {call.internalNumber || ""}
      </div>
    </>
  );
}

export function renderStatusCell(call: CallWithDetails["call"]) {
  const status = call.status;
  const duration = call.duration ?? 0;

  // Статусы из БД: missed, answered, voicemail, failed, technical_error
  // Если статус не заполнен (null/undefined), вычисляем по duration (для обратной совместимости)
  const computedStatus =
    status ?? (duration === 0 && call.direction === "inbound" ? "missed" : "answered");

  const statusConfig: Record<string, { label: string; className: string }> = {
    missed: { label: "ПРОПУЩЕН", className: "badge-red-op" },
    answered: { label: "ПРИНЯТ", className: "badge-green-op" },
    voicemail: { label: "ГОЛОС. ПОЧТА", className: "badge-yellow-op" },
    failed: { label: "ОШИБКА", className: "badge-red-op" },
    technical_error: { label: "ОШИБКА", className: "badge-red-op" },
  };

  // Для неизвестных статусов возвращаем явный unknown badge
  const config = statusConfig[computedStatus] ?? {
    label: "НЕИЗВЕСТНО",
    className: "badge-gray-op",
  };

  return <span className={`op-badge ${config.className}`}>{config.label}</span>;
}

export function renderDateCell(call: CallWithDetails["call"]) {
  return (
    <span style={{ whiteSpace: "nowrap", color: "#555" }}>{formatTimestamp(call.timestamp)}</span>
  );
}

export function renderScoreCell(evaluation: CallWithDetails["evaluation"]) {
  const score = evaluation?.valueScore;
  const hasScore = score != null; // Проверяем на null и undefined

  if (!hasScore) {
    return <span style={{ color: "#ccc" }}>Не оценено</span>;
  }

  // Аномальное значение score === 0 - логируем для диагностики
  if (score === 0) {
    console.warn(
      `[renderScoreCell] Обнаружено аномальное значение score=0 для evaluation id=${evaluation?.id ?? "unknown"}`,
    );
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="op-tooltip flex items-center">
            <Rating rating={0} size="sm" aria-label="Оценка: 0 звезд" />
            <span className="ml-1 text-xs text-amber-600" aria-hidden="true">
              ⚠️
            </span>
            <span className="sr-only">Аномальное значение оценки</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Аномальное значение оценки: 0</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center">
          <Rating rating={score} size="sm" />
        </div>
      </TooltipTrigger>
      {evaluation?.valueExplanation && (
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">Обоснование:</p>
          <p>{evaluation.valueExplanation}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}

export function renderSummaryCell(transcript: CallWithDetails["transcript"]) {
  if (!transcript?.summary) {
    return <span style={{ color: "#ccc" }}>—</span>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block min-w-0 max-w-55 truncate cursor-default text-[#666]">
          {transcript.summary}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-md max-h-80 overflow-y-auto whitespace-pre-wrap text-left"
      >
        <div className="font-medium mb-1">Резюме</div>
        {transcript.summary}
      </TooltipContent>
    </Tooltip>
  );
}

export function renderDurationCell(call: CallWithDetails["call"]) {
  return (
    <span style={{ fontWeight: 600, color: "#444" }}>{formatDuration(call.duration ?? 0)}</span>
  );
}
