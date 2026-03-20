import { toast } from "@calls/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import type React from "react";
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

  const usersQuery = useQuery({
    ...orpc.users.getForEdit.queryOptions({ input: { user_id: userId } }),
    enabled: !!userId,
  });
  const userData = usersQuery.data;

  const { data: usersList = [] } = useQuery({
    ...orpc.users.list.queryOptions(),
    enabled: !!userId && isWorkspaceAdmin,
  });

  const updateMutation = useMutation(
    orpc.users.update.mutationOptions({
      onError: (err) => {
        const msg =
          err instanceof Error
            ? err.message
            : "Не удалось сохранить настройки.";
        toast.error(msg);
      },
    }),
  );

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
    kpiBaseSalary: "0",
    kpiTargetBonus: "0",
    kpiTargetTalkTimeMinutes: "0",
    reportDailyTime: "09:00",
    reportWeeklyDay: "monday",
    reportWeeklyTime: "09:00",
    reportMonthlyDay: "1",
    reportMonthlyTime: "09:00",
    reportManagedUserIds: [],
    maxChatId: "",
    maxDailyReport: false,
    maxManagerReport: false,
  });

  useEffect(() => {
    if (!userData) return;
    const d = userData as UserSettingsData;
    setForm({
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
      kpiBaseSalary: String(d.kpiBaseSalary ?? 0),
      kpiTargetBonus: String(d.kpiTargetBonus ?? 0),
      kpiTargetTalkTimeMinutes: String(d.kpiTargetTalkTimeMinutes ?? 0),
      reportDailyTime: "09:00",
      reportWeeklyDay: "monday",
      reportWeeklyTime: "09:00",
      reportMonthlyDay: "1",
      reportMonthlyTime: "09:00",
      reportManagedUserIds: d.reportManagedUserIds ?? [],
      maxChatId: d.maxChatId ?? "",
      maxDailyReport: d.maxDailyReport ?? false,
      maxManagerReport: d.maxManagerReport ?? false,
    });
  }, [userData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        user_id: userId,
        data: {
          email: form.email || undefined,
          emailDailyReport: form.emailDailyReport,
          emailWeeklyReport: form.emailWeeklyReport,
          emailMonthlyReport: form.emailMonthlyReport,

          telegramDailyReport: form.telegramDailyReport,
          telegramWeeklyReport: form.telegramWeeklyReport,
          telegramMonthlyReport: form.telegramMonthlyReport,
          telegramSkipWeekends: form.telegramSkipWeekends,
          telegramManagerReport: form.reportManagedUserIds.length > 0,
          reportManagedUserIds: JSON.stringify(form.reportManagedUserIds),

          reportIncludeCallSummaries: form.reportIncludeCallSummaries,
          reportDetailed: form.reportDetailed,
          reportIncludeAvgValue: form.reportIncludeAvgValue,
          reportIncludeAvgRating: form.reportIncludeAvgRating,

          filterExcludeAnsweringMachine: form.filterExcludeAnsweringMachine,
          filterMinDuration: Number(form.filterMinDuration) || 0,
          filterMinReplicas: Number(form.filterMinReplicas) || 0,

          kpiBaseSalary: Number(form.kpiBaseSalary) || 0,
          kpiTargetBonus: Number(form.kpiTargetBonus) || 0,
          kpiTargetTalkTimeMinutes: Number(form.kpiTargetTalkTimeMinutes) || 0,

          maxChatId: form.maxChatId || null,
          maxDailyReport: form.maxDailyReport,
          maxManagerReport: form.maxManagerReport,
        },
      });
      toast.success("Настройки сохранены");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Не удалось сохранить настройки";
      toast.error(msg);
    }
  };

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

  if (!userData) return null;

  return (
    <ReportSettingsFormBody
      form={form}
      setForm={setForm}
      handleSubmit={handleSubmit}
      saving={updateMutation.isPending}
      user={user}
      isAdmin={isWorkspaceAdmin}
      allUsers={allUsers}
    />
  );
}
