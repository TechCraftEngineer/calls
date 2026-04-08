"use client";

import { Card, CardContent, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@calls/ui";
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, FileText, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import type { User } from "@/lib/auth";
import { useORPC } from "@/orpc/react";
import { ReportChannelsTab } from "./report-channels-tab";
import { ReportContentTab } from "./report-content-tab";
import { ReportScheduleTab } from "./report-schedule-tab";
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
  kpiBaseSalary?: number;
  kpiTargetBonus?: number;
  kpiTargetTalkTimeMinutes?: number;
}

const TAB_STYLE =
  "rounded-none border-b-2 border-transparent -mb-0.5 data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground bg-transparent shadow-none py-3 px-4 gap-2";

export default function ReportSettingsPanel({ user }: { user: User }) {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();
  const isWorkspaceAdmin = activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";
  const userId = user?.id ? String(user.id) : "";

  const updateScheduleMutation = useMutation(
    orpc.users.updateTelegramSettings.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getReportScheduleSettings.queryKey(),
        });
      },
    }),
  );

  const usersQuery = useQuery(
    userId
      ? orpc.users.getForEdit.queryOptions({ input: { user_id: userId } })
      : {
          queryKey: ["report-settings", "user", "skip"],
          queryFn: skipToken,
        },
  );
  const userData = usersQuery.data;

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
    reportIncludeAvgRating: false,
    reportIncludeAvgValue: false,
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

  if (!userData) {
    return (
      <div aria-busy="true" className="space-y-6 animate-pulse">
        <div className="flex gap-4 border-b">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-32" />
          ))}
        </div>
        <Card>
          <CardContent className="pt-6 space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full max-w-md" />
                <div className="flex gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Tabs defaultValue="channels" className="space-y-6">
      <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
        <TabsTrigger value="channels" className={TAB_STYLE}>
          <Mail className="h-4 w-4" />
          Каналы
        </TabsTrigger>
        <TabsTrigger value="schedule" className={TAB_STYLE}>
          <Clock className="h-4 w-4" />
          Расписание
        </TabsTrigger>
        <TabsTrigger value="content" className={TAB_STYLE}>
          <FileText className="h-4 w-4" />
          Содержание
        </TabsTrigger>
      </TabsList>

      <TabsContent value="channels" className="space-y-6">
        <ReportChannelsTab form={form} setForm={setForm} user={user} isAdmin={isWorkspaceAdmin} />
      </TabsContent>

      <TabsContent value="schedule" className="space-y-6">
        <ReportScheduleTab
          form={form}
          setForm={setForm}
          isAdmin={isWorkspaceAdmin}
          saving={updateScheduleMutation.isPending}
          onSave={() =>
            updateScheduleMutation.mutate({
              user_id: userId,
              data: {
                reportDailyTime: form.reportDailyTime,
                reportWeeklyDay: form.reportWeeklyDay,
                reportWeeklyTime: form.reportWeeklyTime,
                reportMonthlyDay: form.reportMonthlyDay,
                reportMonthlyTime: form.reportMonthlyTime,
              },
            })
          }
        />
      </TabsContent>

      <TabsContent value="content" className="space-y-6">
        <ReportContentTab form={form} setForm={setForm} />
      </TabsContent>
    </Tabs>
  );
}
