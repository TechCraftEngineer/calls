"use client";

import { Card, DataGrid, DataGridContainer, DataGridTable } from "@calls/ui";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
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
    initialState: {
      sorting: [{ id: "name", desc: false }],
      pagination: { pageSize: 8, pageIndex: 0 },
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
          rowBorder: true,
          headerBorder: true,
          headerBackground: true,
        }}
        tableClassNames={{
          base: "op-table [&_tbody_tr:first-child]:bg-[#F9F9F9]",
        }}
      >
        <DataGridContainer className="border-0">
          <div className="overflow-x-auto">
            <DataGridTable />
          </div>
        </DataGridContainer>
      </DataGrid>
    </Card>
  );
}
