"use client";

import { paths } from "@calls/config";
import { Tabs, TabsList, TabsTrigger } from "@calls/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import KpiTable from "@/components/features/calls/kpi-table";
import ReportSettingsPanel from "@/components/features/settings/report-settings-panel";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import api from "@/lib/api";
import { getCurrentUser, type User } from "@/lib/auth";
import { StatisticsFilters } from "./statistics-filters";
import type { StatsRow } from "./statistics-table";
import { StatisticsTable } from "./statistics-table";

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
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "FORBIDDEN"
      ) {
        router.push(paths.forbidden);
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

  const handleResetFilters = () => {
    setFilters((prev) => ({ ...prev, date_from: "", date_to: "" }));
    setTimeout(loadStats, 100);
  };

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
          <StatisticsFilters
            dateFrom={filters.date_from}
            dateTo={filters.date_to}
            onDateFromChange={(v) =>
              setFilters((prev) => ({ ...prev, date_from: v }))
            }
            onDateToChange={(v) =>
              setFilters((prev) => ({ ...prev, date_to: v }))
            }
            onApply={loadStats}
            onReset={handleResetFilters}
          />
        )}

        {activeTab === "statistics" && (
          <StatisticsTable
            stats={stats}
            loading={loading}
            filters={filters}
            onSort={handleSort}
          />
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
