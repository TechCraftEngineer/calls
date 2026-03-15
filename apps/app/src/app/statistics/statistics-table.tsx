"use client";

import {
  Badge,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@calls/ui";

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

export interface StatsRow {
  name: string;
  internal_number: string;
  incoming: { count: number; duration: number };
  outgoing: { count: number; duration: number };
  score_distribution: Record<string, { count: number }>;
}

interface StatisticsTableProps {
  stats: StatsRow[];
  loading: boolean;
  filters: { sort: string; order: string };
  onSort: (field: string) => void;
}

export function StatisticsTable({
  stats,
  loading,
  filters,
  onSort,
}: StatisticsTableProps) {
  const totals = stats.reduce(
    (acc, row) => ({
      incoming_count: acc.incoming_count + row.incoming.count,
      outgoing_count: acc.outgoing_count + row.outgoing.count,
      incoming_duration: acc.incoming_duration + row.incoming.duration,
      outgoing_duration: acc.outgoing_duration + row.outgoing.duration,
    }),
    {
      incoming_count: 0,
      outgoing_count: 0,
      incoming_duration: 0,
      outgoing_duration: 0,
    },
  );

  return (
    <Card className="card p-0! overflow-hidden">
      <div className="py-5 px-6 border-b border-[#EEE] flex justify-between items-center">
        <h3 className="section-title m-0">Статистика по внутренним номерам</h3>
        <div className="flex gap-2 items-center">
          <span className="text-[11px] font-semibold text-[#999] uppercase tracking-wide">
            СОРТИРОВКА:
          </span>
          <Button
            variant="outline"
            size="sm"
            className={filters.sort === "incoming_count" ? "bg-secondary" : ""}
            onClick={() => onSort("incoming_count")}
          >
            Входящие
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={filters.sort === "outgoing_count" ? "bg-secondary" : ""}
            onClick={() => onSort("outgoing_count")}
          >
            Исходящие
          </Button>
        </div>
      </div>

      <Table className="op-table">
        <TableHeader>
          <TableRow className="border-none">
            <TableHead>Сотрудник</TableHead>
            <TableHead>Внутренний номер</TableHead>
            <TableHead
              colSpan={2}
              className="text-center border-b border-[#EEE]"
            >
              Количество звонков
            </TableHead>
            <TableHead
              colSpan={2}
              className="text-center border-b border-[#EEE]"
            >
              Время разговора
            </TableHead>
            <TableHead>Распределение оценок</TableHead>
          </TableRow>
          <TableRow className="border-none">
            <TableHead></TableHead>
            <TableHead></TableHead>
            <TableHead className="text-[10px] text-[#999] font-semibold">
              Исходящие
            </TableHead>
            <TableHead className="text-[10px] text-[#999] font-semibold">
              Входящие
            </TableHead>
            <TableHead className="text-[10px] text-[#999] font-semibold">
              Исх (мин)
            </TableHead>
            <TableHead className="text-[10px] text-[#999] font-semibold">
              Вх (мин)
            </TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10">
                Загрузка…
              </TableCell>
            </TableRow>
          ) : stats.length > 0 ? (
            <>
              <TableRow className="bg-[#F9F9F9] font-bold">
                <TableCell>
                  Всего
                  {stats.length > 0 && (
                    <div className="text-[11px] text-[#999] font-normal mt-0.5">
                      {stats.length}{" "}
                      {stats.length === 1
                        ? "менеджер"
                        : stats.length < 5
                          ? "менеджера"
                          : "менеджеров"}
                    </div>
                  )}
                </TableCell>
                <TableCell>—</TableCell>
                <TableCell className="text-center font-bold">
                  {totals.outgoing_count}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {totals.incoming_count}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {Math.floor(totals.outgoing_duration / 60)}
                </TableCell>
                <TableCell className="text-center font-bold">
                  {Math.floor(totals.incoming_duration / 60)}
                </TableCell>
                <TableCell>—</TableCell>
              </TableRow>
              {stats.map((row) => (
                <TableRow key={row.internal_number || row.name}>
                  <TableCell className="font-semibold">
                    {row.name || "—"}
                  </TableCell>
                  <TableCell>{row.internal_number || "—"}</TableCell>
                  <TableCell className="text-center">
                    {row.outgoing.count}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.incoming.count}
                  </TableCell>
                  <TableCell className="text-center">
                    {Math.floor(row.outgoing.duration / 60)}
                  </TableCell>
                  <TableCell className="text-center">
                    {Math.floor(row.incoming.duration / 60)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5 flex-wrap">
                      {Object.entries(row.score_distribution || {})
                        .toSorted(
                          ([a], [b]) => parseInt(a, 10) - parseInt(b, 10),
                        )
                        .map(([score, data]: [string, { count?: number }]) => {
                          const count = data?.count || 0;
                          if (count === 0) return null;
                          const scoreNum = parseInt(score, 10);
                          return (
                            <Badge
                              key={score}
                              className={getScoreBadgeClasses(scoreNum)}
                            >
                              {score}:{count}
                            </Badge>
                          );
                        })}
                      {Object.keys(row.score_distribution || {}).length ===
                        0 && <span className="text-[#ccc]">—</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </>
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-[#999]">
                Нет данных
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
