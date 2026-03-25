"use client";

import { paths } from "@calls/config";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Rating,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@calls/ui";
import Link from "next/link";
import type { ReactNode } from "react";
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

const analysisCostFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function createLinkOrButton(
  onSelectCall: (callId: string) => void,
): (
  item: CallWithDetails,
  content: ReactNode,
  extraStyle?: object,
) => ReactNode {
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
  const directionLabel =
    call.direction === "inbound" ? "ВХОДЯЩИЙ" : "ИСХОДЯЩИЙ";
  const directionClass =
    directionLabel === "ВХОДЯЩИЙ" ? "badge-yellow-op" : "badge-black-op";
  return <span className={`op-badge ${directionClass}`}>{directionLabel}</span>;
}

export function renderCallTypeCell(transcript: CallWithDetails["transcript"]) {
  const callType = transcript?.callType?.trim();
  if (!callType) {
    return <span style={{ color: "#ccc" }}>—</span>;
  }

  return <span style={{ color: "#555", fontWeight: 500 }}>{callType}</span>;
}

export function renderManagerNameCell(call: CallWithDetails["call"]) {
  const managerName = call.managerName?.trim() || call.operatorName?.trim();
  if (!managerName) {
    return <span style={{ color: "#ccc" }}>—</span>;
  }

  return <span style={{ color: "#555", fontWeight: 500 }}>{managerName}</span>;
}

export function renderCallTopicCell(transcript: CallWithDetails["transcript"]) {
  const callTopic = transcript?.callTopic?.trim();
  if (!callTopic) {
    return <span style={{ color: "#ccc" }}>—</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          tabIndex={0}
          aria-haspopup="dialog"
          aria-label={callTopic}
          className="block min-w-0 max-w-full truncate cursor-pointer bg-transparent border-0 p-0 text-[#555] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              // Radix attaches click handlers to the trigger child when using `asChild`,
              // so we forward Enter/Space via a synthetic click.
              e.currentTarget.click();
            }
          }}
        >
          {callTopic}
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-md whitespace-pre-wrap text-left">
        <div className="font-medium mb-1">Тема звонка</div>
        {callTopic}
      </PopoverContent>
    </Popover>
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
  renderLinkOrButton: (
    item: CallWithDetails,
    content: ReactNode,
    extraStyle?: object,
  ) => ReactNode,
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
  const isMissed = (call.duration ?? 0) === 0 && call.direction === "inbound";
  return (
    <span
      className={`op-badge ${isMissed ? "badge-red-op" : "badge-green-op"}`}
    >
      {isMissed ? "ПРОПУЩЕН" : "ПРИНЯТ"}
    </span>
  );
}

export function renderDateCell(call: CallWithDetails["call"]) {
  return (
    <span style={{ whiteSpace: "nowrap", color: "#555" }}>
      {formatTimestamp(call.timestamp)}
    </span>
  );
}

export function renderScoreCell(evaluation: CallWithDetails["evaluation"]) {
  const score = evaluation?.valueScore ?? 0;
  return (
    <div className="op-tooltip">
      <Rating rating={score} size="sm" />
      {evaluation?.valueExplanation && (
        <div className="tooltip-content">
          <strong>Обоснование:</strong>
          <br />
          {evaluation.valueExplanation}
        </div>
      )}
    </div>
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
    <span style={{ fontWeight: 600, color: "#444" }}>
      {formatDuration(call.duration ?? 0)}
    </span>
  );
}

export function renderAnalysisCostCell(analysisCostRub?: number | null) {
  if (analysisCostRub == null) {
    return <span style={{ color: "#ccc" }}>—</span>;
  }

  return (
    <span style={{ fontWeight: 600, color: "#444", whiteSpace: "nowrap" }}>
      {analysisCostFormatter.format(analysisCostRub)}
    </span>
  );
}
