"use client";

import { toast } from "@calls/ui";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useORPC } from "@/orpc/react";
import { loadColumnOrder, saveColumnOrder } from "./column-storage";
import { COLUMN_ORDER_STORAGE_KEY, COLUMNS, DEFAULT_COLUMN_ORDER } from "./constants";
import type { CallListProps, ColumnConfig } from "./types";

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
  const [visibleColumns, setVisibleColumns] = useState<string[]>(COLUMNS.map((c) => c.key));
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [recommendationsCallId, setRecommendationsCallId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // NOTE: Сортировка выполняется на клиенте. Server-side sorting доступен через API (sortBy/sortOrder),
  // но текущая реализация использует client-side sortConfig для мгновенной сортировки без повторных запросов.
  // Для перехода на server-side: добавьте sortBy/sortOrder в callsListInput и уберите sortedCalls.
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(
    null,
  );

  const sortedCalls = useMemo(() => {
    if (!sortConfig) return props.calls;

    const sorted = [...props.calls];
    const { key, direction } = sortConfig;
    const multiplier = direction === "asc" ? 1 : -1;

    return sorted.sort((a, b) => {
      let valueA: unknown;
      let valueB: unknown;

      // Map column keys to object properties
      switch (key) {
        case "date":
          valueA = a.call.timestamp;
          valueB = b.call.timestamp;
          break;
        case "direction":
          valueA = a.call.direction;
          valueB = b.call.direction;
          break;
        case "number":
          valueA = a.call.number;
          valueB = b.call.number;
          break;
        case "manager":
          valueA = a.call.managerName || a.call.operatorName;
          valueB = b.call.managerName || b.call.operatorName;
          break;
        case "status":
          valueA = a.call.status;
          valueB = b.call.status;
          break;
        case "score":
          valueA = a.evaluation?.valueScore ?? -1;
          valueB = b.evaluation?.valueScore ?? -1;
          break;
        case "duration":
          valueA = a.call.duration ?? 0;
          valueB = b.call.duration ?? 0;
          break;
        default:
          return 0;
      }

      // Handle string comparison
      if (typeof valueA === "string" && typeof valueB === "string") {
        return multiplier * valueA.localeCompare(valueB, "ru");
      }

      // Handle number comparison
      if (typeof valueA === "number" && typeof valueB === "number") {
        return multiplier * (valueA - valueB);
      }

      // Handle null/undefined values (place them at the end regardless of sort direction)
      if (valueA == null && valueB != null) return 1;
      if (valueA != null && valueB == null) return -1;

      return 0;
    });
  }, [props.calls, sortConfig]);

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

  const handleGenerateRecommendations = (callId: string, existingRecommendations?: string[]) => {
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
          const recs = (result as { recommendations?: string[] })?.recommendations ?? [];
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
    sortConfig,
    setSortConfig,
    columnOrder,
    visibleColumns,
    orderedColumns,
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
