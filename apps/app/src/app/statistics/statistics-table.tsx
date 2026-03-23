"use client";

import {
  Button,
  Card,
  DataGrid,
  DataGridColumnVisibility,
  DataGridContainer,
  DataGridPagination,
  DataGridTable,
} from "@calls/ui";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { Settings2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getStatisticsColumns } from "./statistics-table-columns";

export interface StatsRow {
  name: string;
  internalNumber: string;
  incoming: { count: number; duration: number };
  outgoing: { count: number; duration: number };
  scoreDistribution: Record<string, { count: number }>;
  isTotalRow?: boolean;
  /** Количество менеджеров (только для строки «Всего») */
  managerCount?: number;
}

function getRussianPlural(
  count: number,
  forms: [string, string, string],
): string {
  const absCount = Math.abs(count);
  const mod100 = absCount % 100;
  if (mod100 >= 11 && mod100 <= 14) {
    return forms[2];
  }

  const mod10 = absCount % 10;
  if (mod10 === 1) {
    return forms[0];
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return forms[1];
  }
  return forms[2];
}

interface StatisticsTableProps {
  stats: StatsRow[];
  loading: boolean;
}

export function StatisticsTable({ stats, loading }: StatisticsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parseIntegerParam = useCallback(
    (value: string | null, fallback: number, minValue: number) => {
      if (!value) return fallback;
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) && parsed >= minValue ? parsed : fallback;
    },
    [],
  );

  const initialPagination = useMemo<PaginationState>(
    () => ({
      pageIndex: parseIntegerParam(searchParams.get("pageIndex"), 0, 0),
      pageSize: parseIntegerParam(searchParams.get("pageSize"), 8, 1),
    }),
    [parseIntegerParam, searchParams],
  );

  const [pagination, setPagination] =
    useState<PaginationState>(initialPagination);

  useEffect(() => {
    setPagination((prev) => {
      if (
        prev.pageIndex === initialPagination.pageIndex &&
        prev.pageSize === initialPagination.pageSize
      ) {
        return prev;
      }

      return {
        ...prev,
        pageIndex: initialPagination.pageIndex,
        pageSize: initialPagination.pageSize,
      };
    });
  }, [initialPagination]);

  const updatePaginationSearchParams = useCallback(
    (nextPagination: PaginationState) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("pageIndex", String(nextPagination.pageIndex));
      nextParams.set("pageSize", String(nextPagination.pageSize));
      router.push(`${pathname}?${nextParams.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const handlePaginationChange = useCallback(
    (
      updater: PaginationState | ((old: PaginationState) => PaginationState),
    ) => {
      setPagination((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (
          next.pageIndex !== prev.pageIndex ||
          next.pageSize !== prev.pageSize
        ) {
          updatePaginationSearchParams(next);
        }
        return next;
      });
    },
    [updatePaginationSearchParams],
  );

  const totals = useMemo(
    () =>
      stats.reduce(
        (acc, row) => ({
          incomingCount: acc.incomingCount + row.incoming.count,
          outgoingCount: acc.outgoingCount + row.outgoing.count,
          incomingDuration: acc.incomingDuration + row.incoming.duration,
          outgoingDuration: acc.outgoingDuration + row.outgoing.duration,
        }),
        {
          incomingCount: 0,
          outgoingCount: 0,
          incomingDuration: 0,
          outgoingDuration: 0,
        },
      ),
    [stats],
  );

  const totalRow: StatsRow = useMemo(
    () => ({
      name: "Всего",
      internalNumber: "—",
      incoming: {
        count: totals.incomingCount,
        duration: totals.incomingDuration,
      },
      outgoing: {
        count: totals.outgoingCount,
        duration: totals.outgoingDuration,
      },
      scoreDistribution: {},
      isTotalRow: true,
    }),
    [totals],
  );

  const managerCount = stats.length;

  const columns = useMemo(() => getStatisticsColumns(), []);

  const table = useReactTable({
    data: stats,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: handlePaginationChange,
    state: { pagination },
    initialState: {
      sorting: [{ id: "name", desc: false }],
      columnPinning: { left: ["name"] },
    },
  });

  return (
    <Card className="card p-0! overflow-hidden">
      <div className="py-5 px-6 border-b border-[#EEE]">
        <h3 className="section-title m-0">Статистика по внутренним номерам</h3>
      </div>

      <DataGrid
        table={table}
        recordCount={stats.length}
        isLoading={loading}
        emptyMessage="Нет данных"
        tableLayout={{
          columnsVisibility: true,
          columnsMovable: true,
          columnsPinnable: true,
          columnsDraggable: true,
          rowBorder: true,
          headerBorder: true,
          headerBackground: true,
          headerSticky: true,
        }}
        tableClassNames={{
          base: "op-table [&_tbody_tr:first-child]:bg-[#F9F9F9]",
          headerSticky: "sticky top-0 z-30 bg-background/95 backdrop-blur-sm",
        }}
      >
        <div className="flex items-center justify-end gap-2 px-4 pt-3 pb-1">
          <DataGridColumnVisibility
            table={table}
            trigger={
              <Button type="button" variant="outline" size="sm">
                <Settings2 className="size-4" aria-hidden />
                Колонки
              </Button>
            }
          />
        </div>
        <DataGridContainer className="border-0">
          <div className="max-h-[70vh] overflow-auto">
            <div className="min-w-[350px]">
              <DataGridTable />
            </div>
          </div>
          <section
            className="px-4 py-3 border-t border-[#EEE] bg-[#F9F9F9]"
            aria-labelledby="statistics-totals-heading"
            aria-live="polite"
          >
            <h4 id="statistics-totals-heading" className="sr-only">
              Итоги
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-sm">
              <div className="font-semibold">
                Всего
                {managerCount > 0 && (
                  <div className="text-[11px] text-[#999] font-normal mt-0.5">
                    {managerCount}{" "}
                    {getRussianPlural(managerCount, [
                      "менеджер",
                      "менеджера",
                      "менеджеров",
                    ])}
                  </div>
                )}
              </div>
              <div>Исходящие: {totalRow.outgoing.count}</div>
              <div>Входящие: {totalRow.incoming.count}</div>
              <div>
                Длительность исходящих:{" "}
                {Math.floor(totalRow.outgoing.duration / 60)} мин
              </div>
              <div>
                Длительность входящих:{" "}
                {Math.floor(totalRow.incoming.duration / 60)} мин
              </div>
            </div>
          </section>
          <div className="px-4 py-3 border-t border-[#EEE]">
            <DataGridPagination />
          </div>
        </DataGridContainer>
      </DataGrid>
    </Card>
  );
}
