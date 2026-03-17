import { toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import type { User } from "@/lib/auth";
import {
  getFamilyName,
  getGivenName,
  getInternalExtensions,
} from "@/lib/user-profile";
import { useORPC } from "@/orpc/react";
import ReportSettingsFormBody from "./report-settings-form-body";
import type { ReportSettingsForm } from "./report-settings-types";

export default function ReportSettingsPanel({ user }: { user: User }) {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();
  const isWorkspaceAdmin =
    activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";
  const userId = user?.id ? String(user.id) : "";

  const usersQuery = useQuery({
    ...orpc.users.getForEdit.queryOptions({ input: { user_id: userId } }),
    enabled: !!userId,
  });
  const userData = usersQuery.data;

  const promptsQuery = useQuery({
    ...orpc.settings.getPrompts.queryOptions(),
    enabled: !!userId,
  });
  const promptsList = promptsQuery.data;

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
    reportDailyTime: "18:00",
    reportWeeklyDay: "fri",
    reportWeeklyTime: "18:10",
    reportMonthlyDay: "last",
    reportMonthlyTime: "18:20",
    reportManagedUserIds: [],
    maxChatId: "",
    maxDailyReport: false,
    maxManagerReport: false,
  });

  const [loadedUser, setLoadedUser] = useState<{
    givenName?: string;
    familyName?: string;
    internalExtensions?: string;
  } | null>(null);

  const allUsers = useMemo(
    () =>
      (
        usersList as {
          id: string;
          email?: string;
          givenName?: string;
          familyName?: string;
        }[]
      ).map((u) => ({
        id: String(u.id),
        email: u.email ?? "",
        givenName: getGivenName(u),
        familyName: getFamilyName(u),
      })),
    [usersList],
  );

  useEffect(() => {
    const u = userData as
      | {
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
      | undefined;
    if (!u) return;
    const promptsArr = (Array.isArray(promptsList) ? promptsList : []) as {
      key: string;
      value?: string;
    }[];
    const promptsMap: Record<string, string> = {};
    promptsArr.forEach((p) => {
      promptsMap[p.key] = p.value ?? "";
    });
    const normTime = (s: string) => {
      if (!s) return "";
      const m = s.match(/(\d{1,2}):?(\d{0,2})/);
      return m
        ? `${m[1].padStart(2, "0")}:${(m[2] || "0").padStart(2, "0")}`
        : s;
    };
    setLoadedUser({
      givenName: getGivenName(u),
      familyName: getFamilyName(u),
      internalExtensions: getInternalExtensions(u) ?? undefined,
    });
    const managedIds = u.reportManagedUserIds ?? [];
    setForm((prev) => ({
      ...prev,
      reportManagedUserIds: Array.isArray(managedIds) ? managedIds : [],
      email: u.email || "",
      emailDailyReport: u.emailDailyReport ?? false,
      emailWeeklyReport: u.emailWeeklyReport ?? false,
      emailMonthlyReport: u.emailMonthlyReport ?? false,
      telegramChatId: u.telegramChatId || "",
      telegramDailyReport: u.telegramDailyReport ?? false,
      telegramWeeklyReport: u.telegramWeeklyReport ?? false,
      telegramMonthlyReport: u.telegramMonthlyReport ?? false,
      telegramSkipWeekends: u.telegramSkipWeekends ?? false,
      maxChatId: u.maxChatId || "",
      maxDailyReport: u.maxDailyReport ?? false,
      maxManagerReport: u.maxManagerReport ?? false,
      reportIncludeCallSummaries: u.reportIncludeCallSummaries ?? false,
      reportDetailed: u.reportDetailed ?? false,
      reportIncludeAvgValue: u.reportIncludeAvgValue ?? false,
      reportIncludeAvgRating: u.reportIncludeAvgRating ?? false,
      filterExcludeAnsweringMachine: u.filterExcludeAnsweringMachine ?? false,
      filterMinDuration: String(u.filterMinDuration ?? 0),
      filterMinReplicas: String(u.filterMinReplicas ?? 0),
      kpiBaseSalary: String(u.kpiBaseSalary ?? 0),
      kpiTargetBonus: String(u.kpiTargetBonus ?? 0),
      kpiTargetTalkTimeMinutes: String(u.kpiTargetTalkTimeMinutes ?? 0),
      reportDailyTime: normTime(promptsMap.reportDailyTime) || "18:00",
      reportWeeklyDay: (promptsMap.reportWeeklyDay || "fri").toLowerCase(),
      reportWeeklyTime: normTime(promptsMap.reportWeeklyTime) || "18:10",
      reportMonthlyDay: promptsMap.reportMonthlyDay || "last",
      reportMonthlyTime: normTime(promptsMap.reportMonthlyTime) || "18:20",
    }));
  }, [userData, promptsList]);

  const updatePromptsMutation = useMutation(
    orpc.settings.updatePrompts.mutationOptions({
      onError: () => {},
    }),
  );

  const updateMaxMutation = useMutation(
    orpc.users.updateMaxSettings.mutationOptions({
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Не удалось сохранить MAX",
        );
      },
    }),
  );

  const loading = usersQuery.isPending || promptsQuery.isPending;

  const saving =
    updateMutation.isPending ||
    updatePromptsMutation.isPending ||
    updateMaxMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      givenName: loadedUser?.givenName ?? getGivenName(user) ?? "",
      familyName: loadedUser?.familyName ?? getFamilyName(user) ?? "",
      internalExtensions:
        loadedUser?.internalExtensions ??
        getInternalExtensions(user) ??
        undefined,
      email: form.email.trim() || undefined,
      emailDailyReport: form.emailDailyReport,
      emailWeeklyReport: form.emailWeeklyReport,
      emailMonthlyReport: form.emailMonthlyReport,
      telegramChatId: form.telegramChatId.trim() || undefined,
      telegramDailyReport: form.telegramDailyReport,
      telegramWeeklyReport: form.telegramWeeklyReport,
      telegramMonthlyReport: form.telegramMonthlyReport,
      telegramSkipWeekends: form.telegramSkipWeekends,
      reportIncludeCallSummaries: form.reportIncludeCallSummaries,
      reportDetailed: form.reportDetailed,
      reportIncludeAvgValue: form.reportIncludeAvgValue,
      reportIncludeAvgRating: form.reportIncludeAvgRating,
      filterExcludeAnsweringMachine: form.filterExcludeAnsweringMachine,
      filterMinDuration: parseInt(form.filterMinDuration, 10) || 0,
      filterMinReplicas: parseInt(form.filterMinReplicas, 10) || 0,
      kpiBaseSalary: parseInt(form.kpiBaseSalary, 10) || 0,
      kpiTargetBonus: parseInt(form.kpiTargetBonus, 10) || 0,
      kpiTargetTalkTimeMinutes:
        parseInt(form.kpiTargetTalkTimeMinutes, 10) || 0,
      reportManagedUserIds: JSON.stringify(form.reportManagedUserIds ?? []),
    };
    try {
      await updateMutation.mutateAsync({
        user_id: userId,
        data: payload,
      });
      await updateMaxMutation.mutateAsync({
        user_id: userId,
        data: {
          maxChatId: form.maxChatId?.trim() || null,
          maxDailyReport: form.maxDailyReport,
          maxManagerReport: form.maxManagerReport,
        },
      });
      if (isWorkspaceAdmin) {
        await updatePromptsMutation
          .mutateAsync({
            prompts: {
              reportDailyTime: {
                value: form.reportDailyTime || "18:00",
                description: "Время ежедневного отчёта (ЧЧ:ММ)",
              },
              reportWeeklyDay: {
                value: form.reportWeeklyDay || "fri",
                description: "День недели еженедельного",
              },
              reportWeeklyTime: {
                value: form.reportWeeklyTime || "18:10",
                description: "Время еженедельного отчёта",
              },
              reportMonthlyDay: {
                value: form.reportMonthlyDay || "last",
                description: "День месяца (1-28 или last)",
              },
              reportMonthlyTime: {
                value: form.reportMonthlyTime || "18:20",
                description: "Время ежемесячного отчёта",
              },
            },
          })
          .catch(() => {});
      }
      await queryClient.invalidateQueries({
        queryKey: orpc.users.getForEdit.queryKey({
          input: { user_id: userId },
        }),
      });
      await queryClient.invalidateQueries({
        queryKey: orpc.settings.getPrompts.queryKey(),
      });
      toast.success("Настройки сохранены");
    } catch {
      // Ошибка уже обработана в onError мутации updateMutation
    }
  };

  if (loading) return <div>Загрузка настроек…</div>;

  return (
    <ReportSettingsFormBody
      form={form}
      setForm={setForm}
      handleSubmit={handleSubmit}
      saving={saving}
      user={user}
      isAdmin={isWorkspaceAdmin}
      allUsers={allUsers}
    />
  );
}
