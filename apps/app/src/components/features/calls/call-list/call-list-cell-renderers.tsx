"use client";

import { paths } from "@calls/config";
import { Button, Rating } from "@calls/ui";
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

export function createLinkOrButton(
  onSelectCall: (callId: number) => void,
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
    call.direction === "incoming" || call.direction === "Входящий"
      ? "ВХОДЯЩИЙ"
      : "ИСХОДЯЩИЙ";
  const directionClass =
    directionLabel === "ВХОДЯЩИЙ" ? "badge-yellow-op" : "badge-black-op";
  return <span className={`op-badge ${directionClass}`}>{directionLabel}</span>;
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
  return call.customer_name ? (
    <>
      {renderLinkOrButton(item, call.customer_name, {
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
        {call.internal_number || ""}
      </div>
    </>
  );
}

export function renderManagerCell(call: CallWithDetails["call"]) {
  return (
    <span style={{ color: "#555", fontWeight: 500 }}>
      {call.manager_name || call.operator_name || "—"}
    </span>
  );
}

export function renderStatusCell(call: CallWithDetails["call"]) {
  const isMissed =
    (call.duration ?? 0) === 0 &&
    (call.direction === "Входящий" || call.direction === "incoming");
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
  const score = evaluation?.value_score ?? 0;
  return (
    <div className="op-tooltip">
      <Rating rating={score} size="sm" />
      {evaluation?.value_explanation && (
        <div className="tooltip-content">
          <strong>Обоснование:</strong>
          <br />
          {evaluation.value_explanation}
        </div>
      )}
    </div>
  );
}

export function renderSummaryCell(transcript: CallWithDetails["transcript"]) {
  return transcript?.summary ? (
    <div className="op-tooltip min-w-0 max-w-[220px] overflow-hidden">
      <span className="block truncate text-[#666]">{transcript.summary}</span>
      <div className="tooltip-content" style={{ width: "280px" }}>
        <strong>Вывод:</strong>
        <br />
        {transcript.summary}
      </div>
    </div>
  ) : (
    <span style={{ color: "#ccc" }}>—</span>
  );
}

export function renderDurationCell(call: CallWithDetails["call"]) {
  return (
    <span style={{ fontWeight: 600, color: "#444" }}>
      {formatDuration(call.duration ?? 0)}
    </span>
  );
}
