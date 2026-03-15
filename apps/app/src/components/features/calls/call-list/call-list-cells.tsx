"use client";

import { paths } from "@calls/config";
import { Button, TableCell } from "@calls/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { isMobileDevice } from "@/lib/utils";
import type { CallWithDetails } from "./types";

const ROW_BG_LIGHT = "#ffffff";
const ROW_BG_DARK = "#F1F1F3";

export function formatTimestamp(ts: string): string {
  if (!ts) return "—";
  const date = new Date(ts);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null) return "00:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export function getDayBackgroundIndex(
  sortedCalls: CallWithDetails[],
): Map<string, number> {
  const map = new Map<string, number>();
  let index = 0;
  for (const item of sortedCalls) {
    const ts = item.call.timestamp;
    if (!ts) continue;
    const dateKey = new Date(ts).toISOString().slice(0, 10);
    if (!map.has(dateKey)) {
      map.set(dateKey, index % 2);
      index++;
    }
  }
  return map;
}

export function getRowBackground(
  dateKey: string,
  dayBackgroundIndex: Map<string, number>,
): string {
  const dayIndex = dateKey ? dayBackgroundIndex.get(dateKey) : 0;
  return dayIndex === 1 ? ROW_BG_DARK : ROW_BG_LIGHT;
}

interface CellRendererProps {
  item: CallWithDetails;
  colKey: string;
  visibleColumns: string[];
  onSelectCall: (callId: number) => void;
  onGenerateRecommendations: (
    callId: number,
    existingRecommendations?: string[],
  ) => void;
  onPlay?: (filename: string, number: string) => void;
  isLoadingRecommendations: boolean;
  recommendationsCallId: number | null;
}

const linkButtonStyle = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
  textDecoration: "none",
  color: "inherit",
  font: "inherit",
} as const;

export function renderCallListCell({
  item,
  colKey,
  visibleColumns,
  onSelectCall,
  onGenerateRecommendations,
  onPlay,
  isLoadingRecommendations,
  recommendationsCallId,
}: CellRendererProps): ReactNode {
  const { call, transcript, evaluation } = item;

  if (!visibleColumns.includes(colKey)) return null;

  const isMissed =
    call.duration_seconds === 0 &&
    (call.direction === "Входящий" || call.direction === "incoming");

  const directionLabel =
    call.direction === "incoming" || call.direction === "Входящий"
      ? "ВХОДЯЩИЙ"
      : "ИСХОДЯЩИЙ";
  const directionClass =
    directionLabel === "ВХОДЯЩИЙ" ? "badge-yellow-op" : "badge-black-op";

  const renderLinkOrButton = (content: ReactNode, extraStyle?: object) =>
    isMobileDevice() ? (
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

  switch (colKey) {
    case "type":
      return (
        <TableCell key={colKey} style={{ width: "120px" }}>
          <span className={`op-badge ${directionClass}`}>{directionLabel}</span>
        </TableCell>
      );
    case "number":
      return (
        <TableCell key={colKey}>
          {call.customer_name ? (
            <>
              {renderLinkOrButton(call.customer_name, {
                fontSize: "15px",
                fontWeight: 700,
                display: "block",
                marginBottom: "4px",
              })}
              <div style={{ fontSize: "11px", color: "#999" }}>
                {call.number || ""}
              </div>
            </>
          ) : (
            <>
              {renderLinkOrButton(call.number)}
              <div
                style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}
              >
                {call.internal_number || ""}
              </div>
            </>
          )}
        </TableCell>
      );
    case "manager":
      return (
        <TableCell key={colKey}>
          <span style={{ color: "#555", fontWeight: 500 }}>
            {call.manager_name || call.operator_name || "—"}
          </span>
        </TableCell>
      );
    case "status":
      return (
        <TableCell key={colKey}>
          <span
            className={`op-badge ${isMissed ? "badge-red-op" : "badge-green-op"}`}
          >
            {isMissed ? "ПРОПУЩЕН" : "ПРИНЯТ"}
          </span>
        </TableCell>
      );
    case "date":
      return (
        <TableCell key={colKey} style={{ whiteSpace: "nowrap", color: "#555" }}>
          {formatTimestamp(call.timestamp)}
        </TableCell>
      );
    case "score":
      return (
        <TableCell key={colKey}>
          {evaluation?.value_score ? (
            <div className="op-tooltip">
              <div
                style={{
                  color: "#FFD600",
                  fontSize: "16px",
                  letterSpacing: "2px",
                }}
              >
                {"★".repeat(evaluation.value_score)}
                {"☆".repeat(5 - evaluation.value_score)}
              </div>
              {evaluation.value_explanation && (
                <div className="tooltip-content">
                  <strong>Обоснование:</strong>
                  <br />
                  {evaluation.value_explanation}
                </div>
              )}
            </div>
          ) : (
            <span style={{ color: "#FFD600", opacity: 0.3 }}>☆☆☆☆☆</span>
          )}
        </TableCell>
      );
    case "summary":
      return (
        <TableCell key={colKey}>
          {transcript?.summary ? (
            <div
              className="op-tooltip"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span
                style={{
                  maxWidth: "220px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: "#666",
                }}
              >
                {transcript.summary}
              </span>
              <span className="info-icon">i</span>
              <div className="tooltip-content" style={{ width: "280px" }}>
                <strong>Вывод:</strong>
                <br />
                {transcript.summary}
              </div>
            </div>
          ) : (
            <span style={{ color: "#ccc" }}>—</span>
          )}
        </TableCell>
      );
    case "record":
      return (
        <TableCell key={colKey} style={{ textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {call.filename && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onGenerateRecommendations(
                      call.id,
                      evaluation?.manager_recommendations,
                    );
                  }}
                  disabled={
                    isLoadingRecommendations &&
                    recommendationsCallId === call.id
                  }
                  title="Сформировать рекомендации"
                  aria-label="Сформировать рекомендации по звонку"
                  className="size-6 min-w-6 p-0"
                >
                  {isLoadingRecommendations &&
                  recommendationsCallId === call.id ? (
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
                  )}
                </Button>
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
                </Button>
              </>
            )}
          </div>
        </TableCell>
      );
    case "duration":
      return (
        <TableCell key={colKey} style={{ fontWeight: 600, color: "#444" }}>
          {formatDuration(call.duration_seconds)}
        </TableCell>
      );
    default:
      return null;
  }
}
