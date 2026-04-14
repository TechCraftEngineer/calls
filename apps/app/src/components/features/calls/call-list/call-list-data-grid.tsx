"use client";

import {
  Button,
  Checkbox,
  DataGrid,
  DataGridColumnVisibility,
  DataGridContainer,
  DataGridPagination,
  DataGridTableDnd,
  IconPlaceholder,
  toast,
} from "@calls/ui";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useMutation } from "@tanstack/react-query";
import {
  type ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { PAGINATION_CONSTANTS } from "@/constants/pagination";
import { useORPC } from "@/orpc/react";
import CallDetailModal from "../call-detail-modal";
import RecommendationsModal from "../recommendations-modal";
import { BulkDeleteConfirmModal } from "./bulk-delete-confirm-modal";
import { getCallListColumns } from "./call-list-columns";
import { CallListEmpty } from "./call-list-empty";
import { useCallListSelection, useColumnSchema, useDayToneByDate } from "./call-list-hooks";
import type { CallListProps } from "./types";

export interface CallListDataGridProps extends CallListProps {
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
  isLoading?: boolean;
  onPaginationChange: (page: number, perPage: number) => void;
}

export function CallListDataGrid({
  calls,
  onPlay,
  onCallDeleted,
  onCallsDeleted,
  onRecommendationsGenerated,
  pagination,
  isLoading = false,
  onPaginationChange,
}: CallListDataGridProps) {
  const orpc = useORPC();
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();
  const isWorkspaceAdmin = activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [recommendationsCallId, setRecommendationsCallId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // Используем хук для управления выборкой строк
  const { rowSelection, setRowSelection, selectedCalls, selectedCallIds, clearSelection } =
    useCallListSelection(calls);

  // Используем хук для управления тонами дат
  const _dayToneByDate = useDayToneByDate(calls);

  // Используем хук для управления схемой колонок
  const {
    columnSchema,
    effectiveColumnOrder,
    handleColumnOrderChange,
    handleColumnVisibilityChange,
  } = useColumnSchema();

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

  const deleteManyMutation = useMutation(
    orpc.calls.deleteMany.mutationOptions({
      onSuccess: (result) => {
        const hasFailures = !result.success || result.failed.length > 0;

        setShowBulkDeleteConfirm(false);
        onCallsDeleted?.(result.deletedCallIds);

        if (hasFailures) {
          setRowSelection((prev) => {
            const next = { ...prev };
            for (const callId of result.deletedCallIds) {
              delete next[callId];
            }
            return next;
          });
          toast.warning(result.message);
          return;
        }

        setRowSelection({});
        toast.success(`Удалено звонков: ${result.deletedCount}`);
      },
      onError: (error) => {
        const errorMessage =
          error instanceof Error ? error.message : "Не удалось удалить выбранные звонки";
        toast.error(errorMessage);
      },
    }),
  );

  const handleGenerateRecommendations = useCallback(
    (callId: string, existingRecommendations?: string[]) => {
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
    },
    [generateRecommendationsMutation, onRecommendationsGenerated],
  );

  const handleCloseRecommendations = useCallback(() => {
    setRecommendationsCallId(null);
    setRecommendations([]);
  }, []);

  const handleTranscribe = useCallback(
    (callId: string) => {
      transcribeMutation.mutate({ call_id: callId });
    },
    [transcribeMutation],
  );

  const columns = useMemo<ColumnDef<(typeof calls)[0]>[]>(
    () => [
      ...(isWorkspaceAdmin
        ? [
            {
              id: "select",
              header: ({ table }) => (
                <div className="flex h-full w-full items-center justify-center ps-1">
                  <Checkbox
                    checked={
                      table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
                        ? "indeterminate"
                        : table.getIsAllPageRowsSelected()
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Выбрать все звонки на странице"
                  />
                </div>
              ),
              cell: ({ row }) => (
                <div className="flex h-full w-full items-center justify-center ps-1">
                  <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Выбрать звонок"
                    onClick={(event) => event.stopPropagation()}
                  />
                </div>
              ),
              enableSorting: false,
              enableHiding: false,
              enableColumnOrdering: false,
              enableResizing: false,
              size: 60,
              meta: { headerTitle: "Выбор" },
            } as ColumnDef<(typeof calls)[0]>,
          ]
        : []),
      ...getCallListColumns({
        onSelectCall: setSelectedCallId,
        onGenerateRecommendations: handleGenerateRecommendations,
        onTranscribe: handleTranscribe,
        onPlay,
        isLoadingRecommendations: generateRecommendationsMutation.isPending,
        router,
        recommendationsCallId,
        isWorkspaceAdmin,
      }),
    ],
    [
      isWorkspaceAdmin,
      onPlay,
      handleGenerateRecommendations,
      handleTranscribe,
      generateRecommendationsMutation.isPending,
      recommendationsCallId,
      router,
    ],
  );

  useEffect(() => {
    if (pagination.page < 1 || pagination.perPage < 1) return;
    clearSelection();
  }, [pagination.page, pagination.perPage, clearSelection]);

  const table = useReactTable({
    data: calls,
    columns,
    getRowId: (row) => row.call.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages || 1,
    enableRowSelection: isWorkspaceAdmin,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    state: {
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
      },
      columnOrder: effectiveColumnOrder,
      columnVisibility: columnSchema.columnVisibility,
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: handleColumnOrderChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onPaginationChange: (updater) => {
      const prev = {
        pageIndex: pagination.page - 1,
        pageSize: pagination.perPage,
      };
      const next = typeof updater === "function" ? updater(prev) : prev;
      if (next) {
        onPaginationChange(next.pageIndex + 1, next.pageSize);
      }
    },
  });

  const handleBulkDelete = useCallback(() => {
    if (selectedCallIds.length === 0 || deleteManyMutation.isPending) {
      return;
    }

    deleteManyMutation.mutate({ call_ids: selectedCallIds });
  }, [deleteManyMutation, selectedCallIds]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (active && over && active.id !== over.id) {
        handleColumnOrderChange((columnOrder) => {
          const oldIndex = columnOrder.indexOf(active.id as string);
          const newIndex = columnOrder.indexOf(over.id as string);
          return arrayMove(columnOrder, oldIndex, newIndex);
        });
      }
    },
    [handleColumnOrderChange],
  );

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
          columnsResizable: true,
          columnsDraggable: true,
          rowBorder: true,
          headerBorder: true,
          headerBackground: true,
          headerSticky: true,
        }}
        tableClassNames={{ base: "op-table" }}
      >
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-1">
            <div className="text-muted-foreground text-sm">
              {selectedCallIds.length > 0
                ? `Выбрано: ${selectedCallIds.length}`
                : "Выберите звонки галочками для удаления"}
            </div>
            <div className="flex items-center gap-2">
              {isWorkspaceAdmin && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedCallIds.length === 0 || deleteManyMutation.isPending}
                  onClick={() => setShowBulkDeleteConfirm(true)}
                >
                  Удалить выбранные…
                </Button>
              )}
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
          </div>
          <DataGridContainer className="border-0 max-h-[70vh] overflow-auto">
            <DataGridTableDnd<(typeof calls)[0]> handleDragEnd={handleDragEnd} />
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

      {showBulkDeleteConfirm && selectedCalls.length > 0 && (
        <BulkDeleteConfirmModal
          calls={selectedCalls}
          deleting={deleteManyMutation.isPending}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteConfirm(false)}
        />
      )}
    </>
  );
}
