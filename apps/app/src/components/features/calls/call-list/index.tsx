"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import api from "@/lib/api";
import CallDetailModal from "../call-detail-modal";
import RecommendationsModal from "../recommendations-modal";
import {
  getDayBackgroundIndex,
  getRowBackground,
  renderCallListCell,
} from "./call-list-cells";
import { loadColumnOrder, saveColumnOrder } from "./column-storage";
import {
  COLUMN_ORDER_STORAGE_KEY,
  COLUMN_ORDER_STORAGE_KEY_LEGACY,
  COLUMNS,
  DEFAULT_COLUMN_ORDER,
} from "./constants";
import type {
  CallListProps,
  CallWithDetails,
  ColumnConfig,
  SortKey,
  SortOrder,
} from "./types";

export default function CallList({
  calls,
  onPlay,
  onCallDeleted,
  onRecommendationsGenerated,
}: CallListProps) {
  const { showToast } = useToast();
  const [columnOrder, setColumnOrder] = useState<string[]>(loadColumnOrder);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    COLUMNS.map((c) => c.key),
  );
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    order: SortOrder;
  } | null>(null);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [recommendationsCallId, setRecommendationsCallId] = useState<
    number | null
  >(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);

  const handleSort = (key: SortKey) => {
    const order: SortOrder =
      sortConfig?.key === key && sortConfig.order === "desc" ? "asc" : "desc";
    setSortConfig({ key, order });
  };

  const sortedCalls = useMemo(() => {
    if (!sortConfig) return calls;

    return calls.toSorted((a, b) => {
      let valA: string | number;
      let valB: string | number;

      switch (sortConfig.key) {
        case "type":
          valA = a.call.direction || "";
          valB = b.call.direction || "";
          break;
        case "number":
          valA = a.call.number || "";
          valB = b.call.number || "";
          break;
        case "manager":
          valA = a.call.manager_name || a.call.operator_name || "";
          valB = b.call.manager_name || b.call.operator_name || "";
          break;
        case "status":
          valA = a.call.duration_seconds || 0;
          valB = b.call.duration_seconds || 0;
          break;
        case "date":
          valA = new Date(a.call.timestamp).getTime();
          valB = new Date(b.call.timestamp).getTime();
          break;
        case "score":
          valA = a.evaluation?.value_score || 0;
          valB = b.evaluation?.value_score || 0;
          break;
        case "summary":
          valA = a.transcript?.summary || "";
          valB = b.transcript?.summary || "";
          break;
        case "duration":
          valA = a.call.duration_seconds || 0;
          valB = b.call.duration_seconds || 0;
          break;
        default:
          return 0;
      }

      if (valA < valB) return sortConfig.order === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.order === "asc" ? 1 : -1;
      return 0;
    });
  }, [calls, sortConfig]);

  const dayBackgroundIndex = useMemo(
    () => getDayBackgroundIndex(sortedCalls),
    [sortedCalls],
  );

  useEffect(() => {
    saveColumnOrder(columnOrder);
  }, [columnOrder]);

  const orderedColumns = useMemo(() => {
    return columnOrder
      .map((key) => COLUMNS.find((col) => col.key === key))
      .filter((col): col is ColumnConfig => col !== undefined);
  }, [columnOrder]);

  const handleDragStart = (e: React.DragEvent, columnKey: string) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", columnKey);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedColumn(null);
    setDragOverColumn(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedColumn && draggedColumn !== columnKey) {
      setDragOverColumn(columnKey);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColumnKey: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnKey) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }
    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumnKey);
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);
    setColumnOrder(newOrder);
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleResetOrder = () => {
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    try {
      localStorage.removeItem(COLUMN_ORDER_STORAGE_KEY);
      localStorage.removeItem(COLUMN_ORDER_STORAGE_KEY_LEGACY);
    } catch {
      // ignore
    }
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleGenerateRecommendations = async (
    callId: number,
    existingRecommendations?: string[],
  ) => {
    if (isLoadingRecommendations) return;
    if (existingRecommendations && existingRecommendations.length > 0) {
      setRecommendations(existingRecommendations);
      setRecommendationsCallId(callId);
      return;
    }
    try {
      setIsLoadingRecommendations(true);
      setRecommendationsCallId(callId);
      setRecommendations([]);
      const result = await api.calls.generateRecommendations({
        call_id: callId,
      });
      const recs =
        (result as { recommendations?: string[] })?.recommendations ?? [];
      setRecommendations(recs);
      onRecommendationsGenerated?.(callId, recs);
    } catch {
      showToast("Не удалось сформировать рекомендации", "error");
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const handleCloseRecommendations = () => {
    setRecommendationsCallId(null);
    setRecommendations([]);
  };

  if (calls.length === 0) {
    return (
      <div className="py-[60px] px-5 text-center text-gray-400">
        <div className="text-sm">Нет звонков для отображения</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute right-4 -top-[45px] z-10">
        <button
          type="button"
          onClick={() => setShowColumnToggle(!showColumnToggle)}
          className="bg-transparent border-none cursor-pointer p-2 flex items-center text-gray-400 hover:text-gray-800 transition-colors"
          title="Настройка колонок"
          aria-label="Настройка колонок"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {showColumnToggle && (
          <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg p-3 shadow-lg w-[200px] z-100">
            <div className="text-xs font-bold mb-2 text-gray-400 uppercase">
              Видимость колонок
            </div>
            {orderedColumns.map((col) => (
              <label
                key={col.key}
                className="flex items-center gap-2 py-1 cursor-pointer text-[13px]"
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(col.key)}
                  onChange={() => toggleColumn(col.key)}
                />
                {col.label}
              </label>
            ))}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <button
                onClick={handleResetOrder}
                className="w-full py-1.5 px-3 text-xs bg-gray-100 border border-gray-300 rounded cursor-pointer text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"
              >
                Сбросить порядок колонок
              </button>
            </div>
          </div>
        )}
      </div>

      <table className="op-table">
        <thead>
          <tr>
            {orderedColumns.map(
              (col) =>
                visibleColumns.includes(col.key) && (
                  <th
                    key={col.key}
                    draggable
                    onDragStart={(e) => handleDragStart(e, col.key)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, col.key)}
                    onDragLeave={() => setDragOverColumn(null)}
                    onDrop={(e) => handleDrop(e, col.key)}
                    className="select-none relative transition-colors duration-200"
                    style={{
                      cursor: col.sortKey ? "pointer" : "move",
                      backgroundColor:
                        dragOverColumn === col.key
                          ? "#f0f8ff"
                          : draggedColumn === col.key
                            ? "#f5f5f5"
                            : "transparent",
                      opacity: draggedColumn === col.key ? 0.5 : 1,
                    }}
                    onClick={() => col.sortKey && handleSort(col.sortKey)}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className="cursor-move text-gray-400 text-xs mr-0.5 inline-flex items-center"
                        title="Перетащите для изменения порядка"
                        onMouseDown={(e) => e.stopPropagation()}
                        aria-hidden
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden
                        >
                          {[2, 6, 10].flatMap((x) =>
                            [2, 6, 10].map((y) => (
                              <circle
                                key={`${x}-${y}`}
                                cx={x}
                                cy={y}
                                r={1}
                                fill="currentColor"
                              />
                            )),
                          )}
                        </svg>
                      </span>
                      {col.label}
                      <div className="op-tooltip inline-flex">
                        <span className="info-icon m-0">i</span>
                        <div className="tooltip-content font-normal normal-case tracking-normal">
                          {col.tooltip}
                        </div>
                      </div>
                      {col.sortKey && sortConfig?.key === col.sortKey && (
                        <span className="text-[10px] text-gray-800">
                          {sortConfig.order === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </div>
                  </th>
                ),
            )}
          </tr>
        </thead>
        <tbody>
          {sortedCalls.map((item) => {
            const { call } = item;
            const dateKey = call.timestamp
              ? new Date(call.timestamp).toISOString().slice(0, 10)
              : "";
            const rowBg = getRowBackground(dateKey, dayBackgroundIndex);

            return (
              <tr key={call.id} style={{ backgroundColor: rowBg }}>
                {columnOrder.map((colKey) =>
                  renderCallListCell({
                    item,
                    colKey,
                    visibleColumns,
                    onSelectCall: setSelectedCallId,
                    onGenerateRecommendations: handleGenerateRecommendations,
                    onPlay,
                    isLoadingRecommendations: isLoadingRecommendations,
                    recommendationsCallId,
                  }),
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedCallId && (
        <CallDetailModal
          callId={selectedCallId}
          onClose={() => setSelectedCallId(null)}
          onCallDeleted={(callId) => {
            setSelectedCallId(null);
            onCallDeleted?.(callId);
          }}
        />
      )}

      <RecommendationsModal
        isOpen={recommendationsCallId !== null}
        onClose={handleCloseRecommendations}
        recommendations={recommendations}
        isLoading={isLoadingRecommendations}
      />
    </div>
  );
}
