"use client";

import {
  Button,
  DataGrid,
  DataGridColumnVisibility,
  DataGridContainer,
  DataGridPagination,
  DataGridTable,
  IconPlaceholder,
  toast,
} from "@calls/ui";
import { useMutation } from "@tanstack/react-query";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PAGINATION_CONSTANTS } from "@/constants/pagination";
import { useORPC } from "@/orpc/react";
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
  const orpc = useORPC();
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);
  const [recommendationsCallId, setRecommendationsCallId] = useState<
    number | null
  >(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

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

  const handleGenerateRecommendations = useCallback(
    (callId: number, existingRecommendations?: string[]) => {
      if (generateRecommendationsMutation.isPending) return;
      if (existingRecommendations && existingRecommendations.length > 0) {
        setRecommendations(existingRecommendations);
        setRecommendationsCallId(callId);
        return;
      }
      setRecommendationsCallId(callId);
      setRecommendations([]);
      generateRecommendationsMutation.mutate(
        { call_id: String(callId) },
        {
          onSuccess: (result) => {
            const recs =
              (result as { recommendations?: string[] })?.recommendations ?? [];
            setRecommendations(recs);
            onRecommendationsGenerated?.(callId, recs);
          },
        },
      );
    },
    [generateRecommendationsMutation, onRecommendationsGenerated],
  );

  const handleCloseRecommendations = useCallback(() => {
    setRecommendationsCallId(null);
    setRecommendations([]);
  }, []);

  const handleTranscribe = useCallback(
    (callId: number) => {
      transcribeMutation.mutate({ call_id: String(callId) });
    },
    [transcribeMutation],
  );

  const columns = useMemo(
    () =>
      getCallListColumns({
        onSelectCall: setSelectedCallId,
        onGenerateRecommendations: handleGenerateRecommendations,
        onTranscribe: handleTranscribe,
        onPlay,
        isLoadingRecommendations: generateRecommendationsMutation.isPending,
        recommendationsCallId,
      }),
    [
      onPlay,
      handleGenerateRecommendations,
      handleTranscribe,
      generateRecommendationsMutation.isPending,
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
          isLoading={generateRecommendationsMutation.isPending}
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
        isLoading={generateRecommendationsMutation.isPending}
      />
    </>
  );
}
