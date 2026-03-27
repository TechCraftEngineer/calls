"use client";

import { toast } from "@calls/ui";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useORPC } from "@/orpc/react";
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
  const orpc = useORPC();

  const generateRecommendationsMutation = useMutation(
    orpc.calls.generateRecommendations.mutationOptions({
      onError: () => toast.error("Не удалось сформировать рекомендации"),
    }),
  );

  const transcribeMutation = useMutation(
    orpc.calls.transcribe.mutationOptions({
      onSuccess: () => toast.success("Транскрипция запущена"),
      onError: () => toast.error("Не удалось запустить транскрипцию"),
    }),
  );

  const [columnOrder, setColumnOrder] = useState<string[]>(loadColumnOrder);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    COLUMNS.map((c) => c.key),
  );
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    order: SortOrder;
  } | null>(null);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [recommendationsCallId, setRecommendationsCallId] = useState<
    string | null
  >(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const handleSort = (key: SortKey) => {
    const order: SortOrder =
      sortConfig?.key === key && sortConfig.order === "desc" ? "asc" : "desc";
    setSortConfig({ key, order });
  };

  const sortedCalls = useMemo(
    () => sortCalls(props.calls, sortConfig),
    [props.calls, sortConfig],
  );

  // TODO(ISSUE-CALLS-DAY-BG-REMOVE): Удалить вычисление после удаления deprecated-аргумента dayBackgroundIndex.
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

  const handleGenerateRecommendations = (
    callId: string,
    existingRecommendations?: string[],
  ) => {
    if (generateRecommendationsMutation.isPending) return;
    if (existingRecommendations && existingRecommendations.length > 0) {
      setRecommendations(existingRecommendations);
      setRecommendationsCallId(callId);
      return;
    }
    setRecommendationsCallId(callId);
    setRecommendations([]);
    generateRecommendationsMutation.mutate(
      { call_id: callId },
      {
        onSuccess: (result) => {
          const recs =
            (result as { recommendations?: string[] })?.recommendations ?? [];
          setRecommendations(recs);
          onRecommendationsGenerated?.(callId, recs);
        },
      },
    );
  };

  const handleCloseRecommendations = () => {
    setRecommendationsCallId(null);
    setRecommendations([]);
  };

  const handleTranscribe = (callId: string) => {
    transcribeMutation.mutate({ call_id: callId });
  };

  const handleCallDeleted = (callId: string) => {
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
    isLoadingRecommendations: generateRecommendationsMutation.isPending,
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
        valA = a.call.customerName || "";
        valB = b.call.customerName || "";
        break;
      case "status":
        valA = a.call.duration || 0;
        valB = b.call.duration || 0;
        break;
      case "date":
        valA = new Date(a.call.timestamp).getTime();
        valB = new Date(b.call.timestamp).getTime();
        break;
      case "score":
        valA = a.evaluation?.valueScore || 0;
        valB = b.evaluation?.valueScore || 0;
        break;
      case "summary":
        valA = a.transcript?.summary || "";
        valB = b.transcript?.summary || "";
        break;
      case "analysisCost":
        valA = a.analysisCostRub || 0;
        valB = b.analysisCostRub || 0;
        break;
      case "duration":
        valA = a.call.duration || 0;
        valB = b.call.duration || 0;
        break;
      default:
        return 0;
    }

    if (valA < valB) return sortConfig.order === "asc" ? -1 : 1;
    if (valA > valB) return sortConfig.order === "asc" ? 1 : -1;
    return 0;
  });
}
