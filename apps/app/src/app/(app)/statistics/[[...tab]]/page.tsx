"use client";

import { paths } from "@calls/config";
import { Button, Tabs, TabsList, TabsTrigger, toast } from "@calls/ui";
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import KpiTable from "@/components/features/calls/kpi/kpi-table";
import MonthlyGridTable from "@/components/features/kpi/monthly-grid-table";
import { ReportSettingsPanel } from "@/components/features/settings";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { useSession } from "@/lib/better-auth";
import { useORPC } from "@/orpc/react";
import { StatisticsFilters } from "../statistics-filters";
import { StatisticsPageSkeleton, StatisticsSettingsSkeleton } from "../statistics-skeletons";
import type { StatsRow } from "../statistics-table";
import { StatisticsTable } from "../statistics-table";

const TAB_STYLE =
  "rounded-none border-b-2 border-transparent -mb-0.5 data-[state=active]:border-[#FF6B35] data-[state=active]:text-[#FF6B35] text-[#666] bg-transparent shadow-none py-3 px-6";

function getActiveTab(pathname: string): "statistics" | "kpi" | "grid" | "settings" {
  const segments = pathname.replace(/\/$/, "").split("/");
  const last = segments[segments.length - 1];
  if (last === "kpi") return "kpi";
  if (last === "grid") return "grid";
  if (last === "settings") return "settings";
  return "statistics";
}

function StatisticsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const orpc = useORPC();
  const activeTab = getActiveTab(pathname);

  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user ?? null;
  const userLoading = sessionPending;
  const { activeWorkspace } = useWorkspace();
  const workspaceRole = activeWorkspace?.role ?? "member";

  // Проверяем, пришли ли мы со страницы настройки через параметр URL
  const fromSetup = searchParams.get("fromSetup") === "true";

  // Mutation для обновления прогресса setup
  const updateSetupProgressMutation = useMutation(
    orpc.workspaces.updateSetupProgress.mutationOptions({
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: orpc.workspaces.getSetupProgress.queryKey({
            input: { workspaceId: variables.workspaceId },
          }),
        });
      },
    }),
  );

  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
  });

  const statsInput = {
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  };

  const {
    data: result,
    isPending: loading,
    error: statsError,
    refetch: loadStats,
  } = useQuery({
    ...(activeTab === "statistics"
      ? orpc.statistics.getStatistics.queryOptions({ input: statsInput })
      : {
          queryKey: ["statistics", "list", "skip"],
          queryFn: skipToken,
        }),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const stats = (result?.statistics ?? []) as StatsRow[];

  useEffect(() => {
    const segments = pathname.replace(/\/$/, "").split("/");
    if (segments.length >= 3 && !["kpi", "grid", "settings"].includes(segments[2])) {
      router.replace(paths.statistics.root);
    }
    // Перенаправляем со вкладок KPI для пользователей с ролью member
    if (
      activeWorkspace &&
      workspaceRole === "member" &&
      (activeTab === "kpi" || activeTab === "grid")
    ) {
      router.replace(paths.statistics.root);
    }
  }, [pathname, router, workspaceRole, activeTab, activeWorkspace]);

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

  const handleCompleteKpiSetup = () => {
    if (!activeWorkspace) return;
    updateSetupProgressMutation.mutate(
      { workspaceId: activeWorkspace.id, completedStep: "kpi" },
      {
        onSuccess: () => {
          toast.success("Шаг завершён");
          router.push(paths.setup.root);
        },
        onError: (err) => {
          // Prefer user-friendly err.message (server throws in Russian)
          let errorMessage: string;
          if (err instanceof Error && err.message) {
            errorMessage = err.message;
          } else if (
            err &&
            typeof err === "object" &&
            "data" in err &&
            err.data &&
            typeof err.data === "object" &&
            "code" in err.data
          ) {
            const code = String((err.data as { code?: string }).code);
            // Map known codes to localized messages
            errorMessage =
              code === "FORBIDDEN"
                ? "Недостаточно прав для выполнения операции"
                : code === "NOT_FOUND"
                  ? "Рабочее пространство не найдено"
                  : `Ошибка: ${code}`;
          } else {
            errorMessage = "Не удалось обновить прогресс настройки";
          }
          toast.error(errorMessage);
        },
      },
    );
  };

  return (
    <main className="main-content">
      <header className="page-header mb-8">
        <h1 className="page-title">Статистика звонков</h1>
        <p className="page-subtitle">Эффективность работы менеджеров</p>
      </header>

      {fromSetup && activeTab === "kpi" && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-900 dark:text-blue-200">
              Ознакомьтесь с настройками KPI. После завершения вы вернётесь к настройке.
            </p>
            <Button
              onClick={handleCompleteKpiSetup}
              disabled={updateSetupProgressMutation.isPending}
              size="sm"
            >
              {updateSetupProgressMutation.isPending ? "Сохранение…" : "Завершить шаг"}
            </Button>
          </div>
        </div>
      )}

      <Tabs value={activeTab} className="mb-6">
        <TabsList className="flex gap-0 p-0 h-auto bg-transparent border-b-2 border-[#EEE] rounded-none w-auto">
          <TabsTrigger value="statistics" asChild className={TAB_STYLE}>
            <Link href={paths.statistics.root}>Сводная статистика</Link>
          </TabsTrigger>
          {workspaceRole !== "member" && (
            <>
              <TabsTrigger value="kpi" asChild className={TAB_STYLE}>
                <Link href={paths.statistics.kpi}>Расчет KPI</Link>
              </TabsTrigger>
              <TabsTrigger value="grid" asChild className={TAB_STYLE}>
                <Link href={paths.statistics.grid}>Календарь KPI</Link>
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="settings" asChild className={TAB_STYLE}>
            <Link href={paths.statistics.settings}>Настройки отчетов</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "statistics" && (
        <StatisticsFilters
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onDateFromChange={(v) => setFilters((prev) => ({ ...prev, dateFrom: v }))}
          onDateToChange={(v) => setFilters((prev) => ({ ...prev, dateTo: v }))}
          onApply={loadStats}
          onReset={handleResetFilters}
        />
      )}

      {activeTab === "statistics" && <StatisticsTable stats={stats} loading={loading} />}

      {activeTab === "kpi" && <KpiTable />}

      {activeTab === "grid" && <MonthlyGridTable />}

      {activeTab === "settings" && userLoading && <StatisticsSettingsSkeleton />}
      {activeTab === "settings" && !userLoading && user && <ReportSettingsPanel user={user} />}
      {activeTab === "settings" && !userLoading && !user && (
        <div className="py-12 text-center text-[#666]">
          Войдите в систему для настройки отчётов.
        </div>
      )}
    </main>
  );
}

export default function StatisticsPage() {
  return (
    <Suspense fallback={<StatisticsPageSkeleton />}>
      <StatisticsPageContent />
    </Suspense>
  );
}
