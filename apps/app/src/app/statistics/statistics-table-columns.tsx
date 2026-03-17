"use client";

import { Badge, DataGridColumnHeader, Skeleton } from "@calls/ui";
import type { ColumnDef } from "@tanstack/react-table";
import type { StatsRow } from "./statistics-table";

function getScoreBadgeClasses(scoreNum: number): string {
  const base = "py-0.5 px-2 rounded-xl text-[11px] font-bold";
  const bg =
    scoreNum === 1
      ? "bg-[#FF5252]"
      : scoreNum === 2
        ? "bg-[#FF9800]"
        : scoreNum === 3
          ? "bg-[#2196F3]"
          : scoreNum === 4
            ? "bg-[#4CAF50]"
            : "bg-[#FFD600]";
  const text =
    scoreNum <= 2 ? "text-white" : scoreNum === 5 ? "text-black" : "text-white";
  return `${base} ${bg} ${text}`;
}

export function getStatisticsColumns(): ColumnDef<StatsRow>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Сотрудник" />
      ),
      cell: ({ row }) => {
        const { isTotalRow, managerCount } = row.original;
        const suffix =
          managerCount === 1
            ? "менеджер"
            : managerCount && managerCount < 5
              ? "менеджера"
              : "менеджеров";
        return (
          <span className={isTotalRow ? "font-bold" : "font-semibold"}>
            {row.original.name || "—"}
            {isTotalRow && managerCount !== undefined && managerCount > 0 && (
              <div className="text-[11px] text-[#999] font-normal mt-0.5">
                {managerCount} {suffix}
              </div>
            )}
          </span>
        );
      },
      meta: {
        headerTitle: "Сотрудник",
        skeleton: <Skeleton className="h-5 w-32" />,
      },
    },
    {
      id: "internalNumber",
      accessorKey: "internalNumber",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Внутренний номер" />
      ),
      cell: ({ row }) => row.original.internalNumber || "—",
      meta: {
        headerTitle: "Внутренний номер",
        skeleton: <Skeleton className="h-5 w-20" />,
      },
    },
    {
      id: "outgoingCount",
      accessorFn: (row) => row.outgoing?.count ?? 0,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Исходящие" />
      ),
      cell: ({ row }) => (
        <span className={row.original.isTotalRow ? "font-bold" : ""}>
          {row.original.outgoing?.count ?? 0}
        </span>
      ),
      meta: {
        headerTitle: "Исходящие",
        skeleton: <Skeleton className="h-5 w-12" />,
      },
    },
    {
      id: "incomingCount",
      accessorFn: (row) => row.incoming?.count ?? 0,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Входящие" />
      ),
      cell: ({ row }) => (
        <span className={row.original.isTotalRow ? "font-bold" : ""}>
          {row.original.incoming?.count ?? 0}
        </span>
      ),
      meta: {
        headerTitle: "Входящие",
        skeleton: <Skeleton className="h-5 w-12" />,
      },
    },
    {
      id: "outgoingDuration",
      accessorFn: (row) => Math.floor((row.outgoing?.duration ?? 0) / 60),
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Исх (мин)" />
      ),
      cell: ({ row }) => (
        <span className={row.original.isTotalRow ? "font-bold" : ""}>
          {Math.floor((row.original.outgoing?.duration ?? 0) / 60)}
        </span>
      ),
      meta: {
        headerTitle: "Исх (мин)",
        skeleton: <Skeleton className="h-5 w-14" />,
      },
    },
    {
      id: "incomingDuration",
      accessorFn: (row) => Math.floor((row.incoming?.duration ?? 0) / 60),
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Вх (мин)" />
      ),
      cell: ({ row }) => (
        <span className={row.original.isTotalRow ? "font-bold" : ""}>
          {Math.floor((row.original.incoming?.duration ?? 0) / 60)}
        </span>
      ),
      meta: {
        headerTitle: "Вх (мин)",
        skeleton: <Skeleton className="h-5 w-14" />,
      },
    },
    {
      id: "scoreDistribution",
      accessorKey: "scoreDistribution",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Распределение оценок"
          visibility={false}
        />
      ),
      cell: ({ row }) => {
        if (row.original.isTotalRow) return "—";
        const dist = row.original.scoreDistribution ?? {};
        const entries = Object.entries(dist).toSorted(
          ([a], [b]) => parseInt(a, 10) - parseInt(b, 10),
        );
        return (
          <div className="flex gap-1.5 flex-wrap">
            {entries.map(([score, data]: [string, { count?: number }]) => {
              const count = data?.count || 0;
              if (count === 0) return null;
              const scoreNum = parseInt(score, 10);
              return (
                <Badge key={score} className={getScoreBadgeClasses(scoreNum)}>
                  {score}:{count}
                </Badge>
              );
            })}
            {entries.length === 0 && <span className="text-[#ccc]">—</span>}
          </div>
        );
      },
      enableSorting: false,
      meta: { headerTitle: "Распределение оценок" },
    },
  ];
}
