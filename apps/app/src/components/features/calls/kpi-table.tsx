import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@calls/ui";
import { useQuery } from "@tanstack/react-query";
import { KpiTableSkeleton } from "@/app/statistics/statistics-skeletons";
import { useORPC } from "@/orpc/react";

interface KpiRow {
  userId: string | number;
  name: string;
  email: string;
  baseSalary: number;
  targetBonus: number;
  targetTalkTimeMinutes: number;
  periodTargetTalkTimeMinutes: number;
  actualTalkTimeMinutes: number;
  kpiCompletionPercentage: number;
  calculatedBonus: number;
  totalCalculatedSalary: number;
  totalCalls: number;
  incoming: number;
  outgoing: number;
  missed: number;
}

export default function KpiTable({
  dateFrom,
  dateTo,
}: {
  dateFrom: string;
  dateTo: string;
}) {
  const orpc = useORPC();
  const dFrom = dateFrom || new Date().toISOString().split("T")[0];
  const dTo = dateTo || new Date().toISOString().split("T")[0];

  const { data = [], isPending: loading } = useQuery({
    ...orpc.statistics.getKpi.queryOptions({
      input: { startDate: dFrom, endDate: dTo },
    }),
    enabled: !!dFrom && !!dTo,
  });

  const rows = Array.isArray(data) ? (data as KpiRow[]) : [];

  if (loading) return <KpiTableSkeleton />;

  return (
    <Card className="card p-0! overflow-hidden mt-6">
      <div className="py-5 px-6 border-b border-[#EEE]">
        <h3 className="section-title m-0">Расчет KPI сотрудников</h3>
      </div>
      <CardContent className="p-0! overflow-x-auto">
        <Table className="op-table">
          <TableHeader>
            <TableRow className="border-none">
              <TableHead>Сотрудник</TableHead>
              <TableHead>Оклад (руб)</TableHead>
              <TableHead>Бонус (руб)</TableHead>
              <TableHead>Цель (мин) / Мес.</TableHead>
              <TableHead>План (мин) / Пер.</TableHead>
              <TableHead>Факт (мин)</TableHead>
              <TableHead>Выполнение (%)</TableHead>
              <TableHead>Бонус за период</TableHead>
              <TableHead>ИТОГО Выплата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.userId}>
                <TableCell className="font-semibold">
                  {row.name} <br />
                  <small className="text-[#999]">{row.email}</small>
                </TableCell>
                <TableCell>{row.baseSalary.toLocaleString()} ₽</TableCell>
                <TableCell>{row.targetBonus.toLocaleString()} ₽</TableCell>
                <TableCell>{row.targetTalkTimeMinutes}</TableCell>
                <TableCell>{row.periodTargetTalkTimeMinutes}</TableCell>
                <TableCell
                  className={
                    row.actualTalkTimeMinutes >= row.periodTargetTalkTimeMinutes
                      ? "text-[var(--status-success)]"
                      : "text-[var(--status-warning)]"
                  }
                >
                  {row.actualTalkTimeMinutes}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[#EEE] h-1.5 rounded overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${row.kpiCompletionPercentage}%`,
                          background:
                            row.kpiCompletionPercentage >= 100
                              ? "var(--status-success)"
                              : "var(--status-warning)",
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold">
                      {row.kpiCompletionPercentage}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-semibold">
                  {row.calculatedBonus.toLocaleString()} ₽
                </TableCell>
                <TableCell className="font-bold text-[var(--brand-primary)]">
                  {row.totalCalculatedSalary.toLocaleString()} ₽
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-[#888]">
                  Нет данных для отображения
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
