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
import { useEffect, useState } from "react";
import { restGet } from "@/lib/api";

interface KpiRow {
  user_id: number;
  name: string;
  email: string;
  base_salary: number;
  target_bonus: number;
  target_talk_time_minutes: number;
  period_target_talk_time_minutes: number;
  actual_talk_time_minutes: number;
  kpi_completion_percentage: number;
  calculated_bonus: number;
  total_calculated_salary: number;
  total_calls: number;
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
  const [data, setData] = useState<KpiRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const d_from = dateFrom || new Date().toISOString().split("T")[0];
        const d_to = dateTo || new Date().toISOString().split("T")[0];
        const res = await restGet<KpiRow[]>(
          `/v1/kpi/?start_date=${d_from}&end_date=${d_to}`,
        );
        setData(Array.isArray(res) ? res : []);
      } catch (_err) {
        // Убрали console.error для продакшена
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateFrom, dateTo]);

  if (loading) return <div>Загрузка таблиц KPI…</div>;

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
            {data.map((row) => (
              <TableRow key={row.user_id}>
                <TableCell className="font-semibold">
                  {row.name} <br />
                  <small className="text-[#999]">{row.email}</small>
                </TableCell>
                <TableCell>{row.base_salary.toLocaleString()} ₽</TableCell>
                <TableCell>{row.target_bonus.toLocaleString()} ₽</TableCell>
                <TableCell>{row.target_talk_time_minutes}</TableCell>
                <TableCell>{row.period_target_talk_time_minutes}</TableCell>
                <TableCell
                  className={
                    row.actual_talk_time_minutes >=
                    row.period_target_talk_time_minutes
                      ? "text-[var(--status-success)]"
                      : "text-[var(--status-warning)]"
                  }
                >
                  {row.actual_talk_time_minutes}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[#EEE] h-1.5 rounded overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${row.kpi_completion_percentage}%`,
                          background:
                            row.kpi_completion_percentage >= 100
                              ? "var(--status-success)"
                              : "var(--status-warning)",
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold">
                      {row.kpi_completion_percentage}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-semibold">
                  {row.calculated_bonus.toLocaleString()} ₽
                </TableCell>
                <TableCell className="font-bold text-[var(--brand-primary)]">
                  {row.total_calculated_salary.toLocaleString()} ₽
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
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
