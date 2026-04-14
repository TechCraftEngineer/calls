"use client";

import { paths } from "@calls/config";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo } from "react";
import { DailyViewClient } from "@/components/features/kpi/daily-view-client";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { useSession } from "@/lib/better-auth";

interface PageProps {
  params: Promise<{ employeeId: string }>;
}

// Функция для получения текущего месяца (первый и последний день)
function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Первый день месяца
  const startDate = new Date(year, month, 1);

  // Последний день месяца
  const endDate = new Date(year, month + 1, 0);

  // Форматируем даты в YYYY-MM-DD используя локальные компоненты (не UTC)
  const formatLocalDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  return {
    startDate: formatLocalDate(startDate),
    endDate: formatLocalDate(endDate),
  };
}

export default function DailyViewPage({ params }: PageProps) {
  const { employeeId } = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending: sessionPending } = useSession();
  const { activeWorkspace } = useWorkspace();

  const user = session?.user ?? null;
  const userLoading = sessionPending;

  // Проверяем права администратора workspace
  const isWorkspaceAdmin = activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";

  // Получаем даты из searchParams или используем текущий месяц по умолчанию
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);
  const startDate = searchParams.get("startDate") || defaultRange.startDate;
  const endDate = searchParams.get("endDate") || defaultRange.endDate;

  // Проверяем авторизацию
  useEffect(() => {
    if (!userLoading && !user) {
      router.push(paths.auth.signin);
    }
  }, [userLoading, user, router]);

  // Проверяем права администратора
  useEffect(() => {
    if (!userLoading && user && !isWorkspaceAdmin) {
      router.push(paths.forbidden);
    }
  }, [userLoading, user, isWorkspaceAdmin, router]);

  // Показываем loading state пока проверяем авторизацию
  if (userLoading || !user || !isWorkspaceAdmin) {
    return (
      <main className="main-content">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      <header className="page-header mb-8">
        <h1 className="page-title">KPI по дням</h1>
        <p className="page-subtitle">Детализированная статистика по дням</p>
      </header>

      <DailyViewClient
        employeeId={employeeId}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </main>
  );
}
