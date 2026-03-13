"use client";

import { paths } from "@calls/config";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@calls/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Header from "@/components/layout/header";
import KpiTable from "@/components/features/calls/kpi-table";
import ReportSettingsPanel from "@/components/features/settings/report-settings-panel";
import Sidebar from "@/components/layout/sidebar";
import api from "@/lib/api";
import { getCurrentUser, type User } from "@/lib/auth";

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

interface StatsRow {
  name: string;
  internal_number: string;
  incoming: {
    count: number;
    duration: number;
  };
  outgoing: {
    count: number;
    duration: number;
  };
  score_distribution: Record<string, { count: number }>;
}

function StatisticsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<StatsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    tabFromUrl === "settings" || tabFromUrl === "kpi"
      ? tabFromUrl
      : "statistics",
  );
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    sort: "name",
    order: "asc",
  });

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push(paths.auth.signin);
        return;
      }
      setUser(currentUser);

      const result = await api.statistics.getStatistics({
        sort: filters.sort,
        order: filters.order,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      });
      setStats((result.statistics || []) as StatsRow[]);
    } catch (error: unknown) {
      // Убрали console.error для продакшена
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "FORBIDDEN"
      ) {
        alert("Доступ запрещен. Только администратору.");
        router.push(paths.dashboard.root);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, router]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "settings" || t === "kpi") setActiveTab(t);
    else if (t === "statistics") setActiveTab("statistics");
  }, [searchParams]);

  const handleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sort: field,
      order: prev.sort === field && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const getTotals = () => {
    return stats.reduce(
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
  };

  const totals = getTotals();

  return (
    <div className="app-container">
      <Sidebar user={user} />
      <Header user={user} />

      <main className="main-content">
        <header className="page-header mb-8">
          <h1 className="page-title">Статистика звонков</h1>
          <p className="page-subtitle">Эффективность работы менеджеров</p>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            setActiveTab(v as "statistics" | "kpi" | "settings")
          }
          className="mb-6"
        >
          <TabsList className="flex gap-0 p-0 h-auto bg-transparent border-b-2 border-[#EEE] rounded-none w-auto">
            <TabsTrigger
              value="statistics"
              className="rounded-none border-b-2 border-transparent -mb-0.5 data-[state=active]:border-[#FF6B35] data-[state=active]:text-[#FF6B35] text-[#666] bg-transparent shadow-none py-3 px-6"
            >
              Сводная статистика
            </TabsTrigger>
            <TabsTrigger
              value="kpi"
              className="rounded-none border-b-2 border-transparent -mb-0.5 data-[state=active]:border-[#FF6B35] data-[state=active]:text-[#FF6B35] text-[#666] bg-transparent shadow-none py-3 px-6"
            >
              Расчет KPI
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-none border-b-2 border-transparent -mb-0.5 data-[state=active]:border-[#FF6B35] data-[state=active]:text-[#FF6B35] text-[#666] bg-transparent shadow-none py-3 px-6"
            >
              Настройки отчетов
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab !== "settings" && (
          <Card className="card mb-6">
            <CardHeader className="p-0 pb-0">
              <div className="section-title mb-5 flex items-center gap-2">
                Фильтрация статистики <span className="text-sm">📅</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex gap-6 items-end flex-wrap">
                <div className="filter-item min-w-[150px]">
                  <label className="filter-label">ДАТА ОТ</label>
                  <Input
                    type="date"
                    className="date-input"
                    value={filters.date_from}
                    onChange={(e) =>
                      setFilters({ ...filters, date_from: e.target.value })
                    }
                    onClick={(e) =>
                      (e.currentTarget as HTMLInputElement).showPicker?.()
                    }
                  />
                </div>
                <div className="filter-item min-w-[150px]">
                  <label className="filter-label">ДАТА ДО</label>
                  <Input
                    type="date"
                    className="date-input"
                    value={filters.date_to}
                    onChange={(e) =>
                      setFilters({ ...filters, date_to: e.target.value })
                    }
                    onClick={(e) =>
                      (e.currentTarget as HTMLInputElement).showPicker?.()
                    }
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    className="apply-btn bg-gradient-to-br from-[#FF6B35] to-[#F7931E] text-white border-none"
                    onClick={loadStats}
                  >
                    Применить
                  </Button>
                  <Button
                    variant="outline"
                    className="ghost-btn bg-white border-[#DDD] text-[#333]"
                    onClick={() => {
                      setFilters({ ...filters, date_from: "", date_to: "" });
                      setTimeout(loadStats, 100);
                    }}
                  >
                    Сбросить
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "statistics" && (
          <Card className="card p-0! overflow-hidden">
            <div className="py-5 px-6 border-b border-[#EEE] flex justify-between items-center">
              <h3 className="section-title m-0">
                Статистика по внутренним номерам
              </h3>
              <div className="flex gap-2 items-center">
                <span className="text-[11px] font-semibold text-[#999] uppercase tracking-wide">
                  СОРТИРОВКА:
                </span>
                <Button
                  variant="outline"
                  className={`ghost-btn border-[#DDD] py-1.5 px-4 text-[13px] font-semibold ${
                    filters.sort === "incoming_count"
                      ? "bg-[#F5F5F7]"
                      : "bg-white"
                  }`}
                  onClick={() => handleSort("incoming_count")}
                >
                  Входящие
                </Button>
                <Button
                  variant="outline"
                  className={`ghost-btn border-[#DDD] py-1.5 px-4 text-[13px] font-semibold ${
                    filters.sort === "outgoing_count"
                      ? "bg-[#F5F5F7]"
                      : "bg-white"
                  }`}
                  onClick={() => handleSort("outgoing_count")}
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
                              .map(
                                ([score, data]: [
                                  string,
                                  { count?: number },
                                ]) => {
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
                                },
                              )}
                            {Object.keys(row.score_distribution || {})
                              .length === 0 && (
                              <span className="text-[#ccc]">—</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-10 text-[#999]"
                    >
                      Нет данных
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {activeTab === "kpi" && (
          <KpiTable dateFrom={filters.date_from} dateTo={filters.date_to} />
        )}

        {activeTab === "settings" && user && (
          <ReportSettingsPanel user={user} />
        )}
      </main>
    </div>
  );
}

export default function StatisticsPage() {
  return (
    <Suspense
      fallback={
        <div className="app-container">
          <main className="main-content py-12 text-center">Загрузка…</main>
        </div>
      }
    >
      <StatisticsPageContent />
    </Suspense>
  );
}
