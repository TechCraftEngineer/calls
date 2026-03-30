"use client";

import { Card, CardContent, Skeleton } from "@calls/ui";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import type { User } from "@/lib/auth";
import { getFamilyName, getGivenName } from "@/lib/user-profile";
import { useORPC } from "@/orpc/react";
import type { UserLike } from "@/types/user";
import ReportSettingsFormBody from "./report-settings-form-body";
import type { ReportSettingsForm } from "./report-settings-types";

interface UserSettingsData {
  email?: string;
  givenName?: string;
  familyName?: string;
  internalExtensions?: string;
  telegramChatId?: string;
  reportManagedUserIds?: string[];
  emailDailyReport?: boolean;
  emailWeeklyReport?: boolean;
  emailMonthlyReport?: boolean;
  telegramDailyReport?: boolean;
  telegramWeeklyReport?: boolean;
  telegramMonthlyReport?: boolean;
  telegramSkipWeekends?: boolean;
  maxChatId?: string;
  maxDailyReport?: boolean;
  maxManagerReport?: boolean;
  reportIncludeCallSummaries?: boolean;
  reportDetailed?: boolean;
  reportIncludeAvgValue?: boolean;
  reportIncludeAvgRating?: boolean;
  filterExcludeAnsweringMachine?: boolean;
  filterMinDuration?: number;
  filterMinReplicas?: number;
  kpiBaseSalary?: number;
  kpiTargetBonus?: number;
  kpiTargetTalkTimeMinutes?: number;
}

export default function ReportSettingsPanel({ user }: { user: User }) {
  const orpc = useORPC();
  const { activeWorkspace } = useWorkspace();
  const isWorkspaceAdmin =
    activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";
  const userId = user?.id ? String(user.id) : "";

  const usersQuery = useQuery(
    userId
      ? orpc.users.getForEdit.queryOptions({ input: { user_id: userId } })
      : {
          queryKey: ["report-settings", "user", "skip"],
          queryFn: skipToken,
        },
  );
  const userData = usersQuery.data;

  const usersListQuery = useQuery(
    userId && isWorkspaceAdmin
      ? orpc.users.list.queryOptions()
      : {
          queryKey: ["report-settings", "users-list", "skip"],
          queryFn: skipToken,
        },
  );
  const usersList = usersListQuery.data ?? [];
  const scheduleQuery = useQuery(
    activeWorkspace?.id
      ? orpc.settings.getReportScheduleSettings.queryOptions()
      : {
          queryKey: ["report-settings", "schedule", "skip"],
          queryFn: skipToken,
        },
  );
  const schedule = scheduleQuery.data;

  const [form, setForm] = useState<ReportSettingsForm>({
    email: "",
    emailDailyReport: false,
    emailWeeklyReport: false,
    emailMonthlyReport: false,
    telegramChatId: "",
    telegramDailyReport: false,
    telegramWeeklyReport: false,
    telegramMonthlyReport: false,
    telegramSkipWeekends: false,
    reportIncludeCallSummaries: false,
    reportDetailed: false,
    reportIncludeAvgValue: false,
    reportIncludeAvgRating: false,
    filterExcludeAnsweringMachine: false,
    filterMinDuration: "0",
    filterMinReplicas: "0",
    reportDailyTime: "18:00",
    reportWeeklyDay: "fri",
    reportWeeklyTime: "18:10",
    reportMonthlyDay: "last",
    reportMonthlyTime: "18:20",
    reportManagedUserIds: [],
    maxChatId: "",
    maxDailyReport: false,
    maxManagerReport: false,
    kpiBaseSalary: "0",
    kpiTargetBonus: "0",
    kpiTargetTalkTimeMinutes: "0",
  });

  useEffect(() => {
    if (!userData) return;
    const d = userData as UserSettingsData;
    setForm((prev) => ({
      ...prev,
      email: d.email ?? "",
      emailDailyReport: d.emailDailyReport ?? false,
      emailWeeklyReport: d.emailWeeklyReport ?? false,
      emailMonthlyReport: d.emailMonthlyReport ?? false,
      telegramChatId: d.telegramChatId ?? "",
      telegramDailyReport: d.telegramDailyReport ?? false,
      telegramWeeklyReport: d.telegramWeeklyReport ?? false,
      telegramMonthlyReport: d.telegramMonthlyReport ?? false,
      telegramSkipWeekends: d.telegramSkipWeekends ?? false,
      reportIncludeCallSummaries: d.reportIncludeCallSummaries ?? false,
      reportDetailed: d.reportDetailed ?? false,
      reportIncludeAvgValue: d.reportIncludeAvgValue ?? false,
      reportIncludeAvgRating: d.reportIncludeAvgRating ?? false,
      filterExcludeAnsweringMachine: d.filterExcludeAnsweringMachine ?? false,
      filterMinDuration: String(d.filterMinDuration ?? 0),
      filterMinReplicas: String(d.filterMinReplicas ?? 0),
      reportManagedUserIds: d.reportManagedUserIds ?? [],
      maxChatId: d.maxChatId ?? "",
      maxDailyReport: d.maxDailyReport ?? false,
      maxManagerReport: d.maxManagerReport ?? false,
      kpiBaseSalary: String(d.kpiBaseSalary ?? 0),
      kpiTargetBonus: String(d.kpiTargetBonus ?? 0),
      kpiTargetTalkTimeMinutes: String(d.kpiTargetTalkTimeMinutes ?? 0),
    }));
  }, [userData]);

  useEffect(() => {
    if (!schedule) return;
    setForm((f) => ({
      ...f,
      reportDailyTime: schedule.reportDailyTime,
      reportWeeklyDay: schedule.reportWeeklyDay,
      reportWeeklyTime: schedule.reportWeeklyTime,
      reportMonthlyDay: schedule.reportMonthlyDay,
      reportMonthlyTime: schedule.reportMonthlyTime,
    }));
  }, [schedule]);

  const allUsers = useMemo(
    () =>
      (usersList as UserLike[]).map((u) => ({
        id: String(u.id),
        email: String((u as Record<string, unknown>).email ?? ""),
        givenName: getGivenName(u) ?? "",
        familyName: getFamilyName(u) ?? "",
      })),
    [usersList],
  );

  if (!userData) {
    return (
      <div aria-busy="true" className="space-y-6 animate-pulse">
        <Card className="card">
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ReportSettingsFormBody
      form={form}
      setForm={setForm}
      user={user}
      isAdmin={isWorkspaceAdmin}
      allUsers={allUsers}
    />
  );
}
