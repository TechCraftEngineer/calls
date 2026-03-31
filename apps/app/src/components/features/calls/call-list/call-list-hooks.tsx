import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDefaultSchema,
  loadColumnSchema,
  saveColumnSchema,
} from "./call-list-data-grid-storage";
import type { CallListProps } from "./types";

export function getLocalDateKey(timestamp?: string | Date | null): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);

  // Проверяем валидность даты
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function useCallListSelection(calls: CallListProps["calls"]) {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const selectedCalls = useMemo(
    () => calls.filter((call) => rowSelection[call.call.id]),
    [calls, rowSelection],
  );

  const selectedCallIds = useMemo(() => selectedCalls.map((item) => item.call.id), [selectedCalls]);

  const clearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  return {
    rowSelection,
    setRowSelection,
    selectedCalls,
    selectedCallIds,
    clearSelection,
  };
}

export function useDayToneByDate(calls: CallListProps["calls"]) {
  return useMemo(() => {
    const todayKey = getLocalDateKey(new Date());
    const tones = new Map<string, 0 | 1 | 2>();

    // Получаем уникальные даты и сортируем их
    const uniqueDates = Array.from(
      new Set(calls.map((item) => getLocalDateKey(item.call.timestamp))),
    ).filter(Boolean);

    // Сортируем даты по времени (от новых к старым)
    uniqueDates.sort((a, b) => b.localeCompare(a));

    // Назначаем тоны в отсортированном порядке
    let pastDayIndex = 0;
    for (const dateKey of uniqueDates) {
      if (dateKey === todayKey) {
        tones.set(dateKey, 0);
      } else {
        tones.set(dateKey, pastDayIndex % 2 === 0 ? 1 : 2);
        pastDayIndex += 1;
      }
    }

    return tones;
  }, [calls]);
}

export function useColumnSchema() {
  const [columnSchema, setColumnSchema] = useState(() => getDefaultSchema());
  const [isHydrated, setIsHydrated] = useState(false);

  const effectiveColumnOrder = useMemo(
    () => ["select", ...columnSchema.columnOrder.filter((column) => column !== "select")],
    [columnSchema.columnOrder],
  );

  useEffect(() => {
    setColumnSchema(loadColumnSchema());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      saveColumnSchema(columnSchema);
    }
  }, [columnSchema, isHydrated]);

  const handleColumnOrderChange = useCallback(
    (updaterOrValue: string[] | ((old: string[]) => string[])) => {
      setColumnSchema((prev) => ({
        ...prev,
        columnOrder:
          typeof updaterOrValue === "function" ? updaterOrValue(prev.columnOrder) : updaterOrValue,
      }));
    },
    [],
  );

  const handleColumnVisibilityChange = useCallback(
    (
      updaterOrValue:
        | Record<string, boolean>
        | ((old: Record<string, boolean>) => Record<string, boolean>),
    ) => {
      setColumnSchema((prev) => ({
        ...prev,
        columnVisibility:
          typeof updaterOrValue === "function"
            ? updaterOrValue(prev.columnVisibility)
            : updaterOrValue,
      }));
    },
    [],
  );

  return {
    columnSchema,
    effectiveColumnOrder,
    isHydrated,
    handleColumnOrderChange,
    handleColumnVisibilityChange,
  };
}
