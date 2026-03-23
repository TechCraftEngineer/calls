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
  useReactTable,
} from "@tanstack/react-table";
import { Settings2 } from "lucide-react";
import { useMemo } from "react";
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

interface StatisticsTableProps {
  stats: StatsRow[];
  loading: boolean;
}

export function StatisticsTable({ stats, loading }: StatisticsTableProps) {
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

  const dataWithTotals = useMemo(() => {
    const count = stats.length;
    return [
      {
        ...totalRow,
        managerCount: count,
      },
      ...stats,
    ];
  }, [stats, totalRow]);

  const columns = useMemo(() => getStatisticsColumns(), []);

  const table = useReactTable({
    data: dataWithTotals,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      sorting: [{ id: "name", desc: false }],
      pagination: { pageSize: 8, pageIndex: 0 },
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
        recordCount={dataWithTotals.length}
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
          headerSticky: "sticky top-0 z-30 bg-background/95 backdrop-blur-xs",
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
            <div className="min-w-350">
              <DataGridTable />
            </div>
          </div>
          <div className="px-4 py-3 border-t border-[#EEE]">
            <DataGridPagination />
          </div>
        </DataGridContainer>
      </DataGrid>
    </Card>
  );
}
