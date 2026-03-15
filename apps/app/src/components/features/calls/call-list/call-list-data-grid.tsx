"use client";

import {
  Button,
  DataGrid,
  DataGridColumnVisibility,
  DataGridContainer,
  DataGridPagination,
  DataGridTable,
  IconPlaceholder,
} from "@calls/ui";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { PAGINATION_CONSTANTS } from "@/constants/pagination";
import api from "@/lib/api";
import CallDetailModal from "../call-detail-modal";
import RecommendationsModal from "../recommendations-modal";
import { getCallListColumns } from "./call-list-columns";
import {
  loadColumnSchema,
  saveColumnSchema,
} from "./call-list-data-grid-storage";
import { CallListEmpty } from "./call-list-empty";
import type { CallListProps } from "./types";

export interface CallListDataGridProps extends CallListProps {
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  isLoading?: boolean;
  onPaginationChange: (page: number, perPage: number) => void;
}

export function CallListDataGrid({
  calls,
  onPlay,
  onCallDeleted,
  onRecommendationsGenerated,
  pagination,
  isLoading = false,
  onPaginationChange,
}: CallListDataGridProps) {
  const { showToast } = useToast();
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);
  const [recommendationsCallId, setRecommendationsCallId] = useState<
    number | null
  >(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);

  const handleGenerateRecommendations = useCallback(
    async (callId: number, existingRecommendations?: string[]) => {
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
    },
    [isLoadingRecommendations, onRecommendationsGenerated, showToast],
  );

  const handleCloseRecommendations = useCallback(() => {
    setRecommendationsCallId(null);
    setRecommendations([]);
  }, []);

  const handleTranscribe = useCallback(
    async (callId: number) => {
      try {
        await api.calls.transcribe({ call_id: String(callId) });
        showToast("Транскрипция запущена", "success");
      } catch {
        showToast("Не удалось запустить транскрипцию", "error");
      }
    },
    [showToast],
  );

  const columns = useMemo(
    () =>
      getCallListColumns({
        onSelectCall: setSelectedCallId,
        onGenerateRecommendations: handleGenerateRecommendations,
        onTranscribe: handleTranscribe,
        onPlay,
        isLoadingRecommendations: isLoadingRecommendations,
        recommendationsCallId,
      }),
    [
      onPlay,
      handleGenerateRecommendations,
      handleTranscribe,
      isLoadingRecommendations,
      recommendationsCallId,
    ],
  );

  const [columnSchema, setColumnSchema] = useState(loadColumnSchema);

  useEffect(() => {
    saveColumnSchema(columnSchema);
  }, [columnSchema]);

  const handleColumnOrderChange = useCallback(
    (updaterOrValue: string[] | ((old: string[]) => string[])) => {
      setColumnSchema((prev) => ({
        ...prev,
        columnOrder:
          typeof updaterOrValue === "function"
            ? updaterOrValue(prev.columnOrder)
            : updaterOrValue,
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

  const table = useReactTable({
    data: calls,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: pagination.total_pages || 1,
    state: {
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.per_page,
      },
      columnOrder: columnSchema.columnOrder,
      columnVisibility: columnSchema.columnVisibility,
    },
    onColumnOrderChange: handleColumnOrderChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onPaginationChange: (updater) => {
      const prev = {
        pageIndex: pagination.page - 1,
        pageSize: pagination.per_page,
      };
      const next = typeof updater === "function" ? updater(prev) : prev;
      if (next) {
        onPaginationChange(next.pageIndex + 1, next.pageSize);
      }
    },
  });

  if (calls.length === 0 && !isLoading) {
    return (
      <>
        <CallListEmpty />
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
      </>
    );
  }

  return (
    <>
      <DataGrid
        table={table}
        recordCount={pagination.total}
        isLoading={isLoading}
        emptyMessage={<CallListEmpty />}
        tableLayout={{
          columnsVisibility: true,
          columnsDraggable: true,
          rowBorder: true,
          headerBorder: true,
          headerBackground: true,
        }}
        tableClassNames={{ base: "op-table" }}
      >
        <div className="flex flex-col">
          <div className="flex justify-end px-4 pt-3 pb-1">
            <DataGridColumnVisibility
              table={table}
              trigger={
                <Button variant="outline" size="sm">
                  <IconPlaceholder
                    lucide="Settings2Icon"
                    tabler="IconSettings"
                    hugeicons="Settings01Icon"
                    phosphor="GearIcon"
                    remixicon="RiSettings3Line"
                    className="size-4"
                    aria-hidden={true}
                  />
                  Колонки
                </Button>
              }
            />
          </div>
          <DataGridContainer className="border-0">
            <div className="overflow-x-auto">
              <DataGridTable<(typeof calls)[0]> />
            </div>
            <div className="px-4 py-3">
              <DataGridPagination
                sizes={[...PAGINATION_CONSTANTS.PER_PAGE_OPTIONS]}
                sizesLabel="Строк на странице"
                info="{from} - {to} из {count}"
                rowsPerPageLabel="Строк на странице"
                previousPageLabel="Предыдущая страница"
                nextPageLabel="Следующая страница"
              />
            </div>
          </DataGridContainer>
        </div>
      </DataGrid>

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
    </>
  );
}
