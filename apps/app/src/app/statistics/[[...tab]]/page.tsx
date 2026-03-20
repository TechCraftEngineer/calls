"use client";

import { paths } from "@calls/config";
import { Tabs, TabsList, TabsTrigger } from "@calls/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import KpiTable from "@/components/features/calls/kpi-table";
import { ReportSettingsPanel } from "@/components/features/settings";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { useSession } from "@/lib/better-auth";
import { useORPC } from "@/orpc/react";
import { StatisticsFilters } from "../statistics-filters";
import {
  StatisticsPageSkeleton,
  StatisticsSettingsSkeleton,
} from "../statistics-skeletons";
import type { StatsRow } from "../statistics-table";
import { StatisticsTable } from "../statistics-table";

const TAB_STYLE =
  "rounded-none border-b-2 border-transparent -mb-0.5 data-[state=active]:border-[#FF6B35] data-[state=active]:text-[#FF6B35] text-[#666] bg-transparent shadow-none py-3 px-6";

function getActiveTab(pathname: string): "statistics" | "kpi" | "settings" {
  const segments = pathname.replace(/\/$/, "").split("/");
  const last = segments[segments.length - 1];
  if (last === "kpi") return "kpi";
  if (last === "settings") return "settings";
  return "statistics";
}

function StatisticsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const orpc = useORPC();
  const activeTab = getActiveTab(pathname);

  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user ?? null;
  const userLoading = sessionPending;
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
  });

  const statsInput = {
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
  };

  const {
    data: result,
    isPending: loading,
    error: statsError,
    refetch: loadStats,
  } = useQuery({
    ...orpc.statistics.getStatistics.queryOptions({ input: statsInput }),
    enabled: activeTab !== "settings",
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const stats = (result?.statistics ?? []) as StatsRow[];

  useEffect(() => {
    const segments = pathname.replace(/\/$/, "").split("/");
    if (segments.length >= 3 && !["kpi", "settings"].includes(segments[2])) {
      router.replace(paths.statistics.root);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (statsError && typeof statsError === "object" && "code" in statsError) {
      if ((statsError as { code?: string }).code === "FORBIDDEN") {
        router.replace(paths.statistics.settings);
      }
    }
  }, [statsError, router]);

  const handleResetFilters = () => {
    setFilters((prev) => ({ ...prev, dateFrom: "", dateTo: "" }));
  };

  return (
    <div className="app-container">
      <Sidebar />
      <Header user={user} />

      <main className="main-content">
        <header className="page-header mb-8">
          <h1 className="page-title">Статистика звонков</h1>
          <p className="page-subtitle">Эффективность работы менеджеров</p>
        </header>

        <Tabs value={activeTab} className="mb-6">
          <TabsList className="flex gap-0 p-0 h-auto bg-transparent border-b-2 border-[#EEE] rounded-none w-auto">
            <TabsTrigger value="statistics" asChild className={TAB_STYLE}>
              <Link href={paths.statistics.root}>Сводная статистика</Link>
            </TabsTrigger>
            <TabsTrigger value="kpi" asChild className={TAB_STYLE}>
              <Link href={paths.statistics.kpi}>Расчет KPI</Link>
            </TabsTrigger>
            <TabsTrigger value="settings" asChild className={TAB_STYLE}>
              <Link href={paths.statistics.settings}>Настройки отчетов</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab !== "settings" && (
          <StatisticsFilters
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onDateFromChange={(v) =>
              setFilters((prev) => ({ ...prev, dateFrom: v }))
            }
            onDateToChange={(v) =>
              setFilters((prev) => ({ ...prev, dateTo: v }))
            }
            onApply={loadStats}
            onReset={handleResetFilters}
          />
        )}

        {activeTab === "statistics" && (
          <StatisticsTable stats={stats} loading={loading} />
        )}

        {activeTab === "kpi" && (
          <KpiTable dateFrom={filters.dateFrom} dateTo={filters.dateTo} />
        )}

        {activeTab === "settings" && userLoading && (
          <StatisticsSettingsSkeleton />
        )}
        {activeTab === "settings" && !userLoading && user && (
          <ReportSettingsPanel user={user} />
        )}
        {activeTab === "settings" && !userLoading && !user && (
          <div className="py-12 text-center text-[#666]">
            Войдите в систему для настройки отчётов.
          </div>
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
          <Sidebar />
          <Header user={null} />
          <main className="main-content">
            <StatisticsPageSkeleton />
          </main>
        </div>
      }
    >
      <StatisticsPageContent />
    </Suspense>
  );
}
