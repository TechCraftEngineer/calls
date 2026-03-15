"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import api from "@/lib/api";
import { getDayBackgroundIndex } from "./call-list-cells";
import { loadColumnOrder, saveColumnOrder } from "./column-storage";
import {
  COLUMN_ORDER_STORAGE_KEY,
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

export function useCallListState(props: CallListProps) {
  const { onPlay, onCallDeleted, onRecommendationsGenerated } = props;
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

  const sortedCalls = useMemo(
    () => sortCalls(props.calls, sortConfig),
    [props.calls, sortConfig],
  );

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

  const handleTranscribe = async (callId: number) => {
    try {
      await api.calls.transcribe({ call_id: String(callId) });
      showToast("Транскрипция запущена", "success");
    } catch {
      showToast("Не удалось запустить транскрипцию", "error");
    }
  };

  const handleCallDeleted = (callId: number) => {
    setSelectedCallId(null);
    onCallDeleted?.(callId);
  };

  return {
    calls: props.calls,
    sortedCalls,
    dayBackgroundIndex,
    columnOrder,
    visibleColumns,
    orderedColumns,
    sortConfig,
    showColumnToggle,
    setShowColumnToggle,
    selectedCallId,
    setSelectedCallId,
    draggedColumn,
    dragOverColumn,
    setDragOverColumn,
    recommendationsCallId,
    recommendations,
    isLoadingRecommendations,
    onPlay,
    handleSort,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    handleResetOrder,
    toggleColumn,
    handleGenerateRecommendations,
    handleCloseRecommendations,
    handleTranscribe,
    handleCallDeleted,
  };
}

function sortCalls(
  calls: CallWithDetails[],
  sortConfig: { key: SortKey; order: SortOrder } | null,
): CallWithDetails[] {
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
}
