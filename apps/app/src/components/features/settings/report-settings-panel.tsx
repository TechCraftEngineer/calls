import { toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
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
import {
  serializeMaxSettingsForApi,
  serializePromptsForApi,
  serializeReportSettingsForApi,
} from "./report-settings-types";

type UserSettings = {
  email?: string;
  internalExtensions?: string;
  givenName?: string;
  familyName?: string;
  report_managed_user_ids?: unknown;
  email_daily_report?: unknown;
  email_weekly_report?: unknown;
  email_monthly_report?: unknown;
  telegramChatId?: string;
  telegram_daily_report?: unknown;
  telegram_weekly_report?: unknown;
  telegram_monthly_report?: unknown;
  telegram_skip_weekends?: unknown;
  max_chat_id?: string;
  max_daily_report?: unknown;
  max_manager_report?: unknown;
  report_include_call_summaries?: unknown;
  report_detailed?: unknown;
  report_include_avg_value?: unknown;
  report_include_avg_rating?: unknown;
  filter_exclude_answering_machine?: unknown;
  filter_min_duration?: unknown;
  filter_min_replicas?: unknown;
  kpi_base_salary?: unknown;
  kpi_target_bonus?: unknown;
  kpi_target_talk_time_minutes?: unknown;
};

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
    filterMinDuration: 0,
    filterMinReplicas: 0,
    kpiBaseSalary: 0,
    kpiTargetBonus: 0,
    kpiTargetTalkTimeMinutes: 0,
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
    const u = userData as UserSettings | undefined;
    if (!u) return;
    const promptsArr = (Array.isArray(promptsList) ? promptsList : []) as {
      key: string;
      value?: string;
    }[];
    const promptsMap: Record<string, string> = {};
    promptsArr.forEach((p) => {
      promptsMap[p.key] = p.value ?? "";
    });
    setLoadedUser({
      givenName: getGivenName(u),
      familyName: getFamilyName(u),
      internalExtensions: getInternalExtensions(u) ?? undefined,
    });
    const bool = (v: unknown) => v === true || v === 1 || v === "1";
    const _normTime = (s: string) => {
      if (!s) return "";
      const m = s.match(/(\d{1,2}):?(\d{0,2})/);
      return m
        ? `${m[1].padStart(2, "0")}:${(m[2] || "0").padStart(2, "0")}`
        : s;
    };
    const managedUserIdSchema = z
      .string()
      .min(1, "ID не может быть пустым")
      .refine((s) => !/^(null|undefined|\[object Object\])$/i.test(s));
    const managedIdsArraySchema = z.array(managedUserIdSchema);
    let managedIds: string[] = [];
    try {
      const raw = u.report_managed_user_ids;
      let toValidate: unknown[] = [];
      if (Array.isArray(raw)) {
        toValidate = raw;
      } else if (typeof raw === "string" && raw.trim()) {
        const parsed = JSON.parse(raw) as unknown;
        toValidate = Array.isArray(parsed) ? parsed : [];
      }
      const result = managedIdsArraySchema.safeParse(
        toValidate.map((x) => String(x)).filter(Boolean),
      );
      managedIds = result.success ? result.data : [];
    } catch (_) {
      managedIds = [];
    }
    setForm((prev) => ({
      ...prev,
      reportManagedUserIds: managedIds,
      email: u.email || "",
      emailDailyReport: bool(u.email_daily_report),
      emailWeeklyReport: bool(u.email_weekly_report),
      emailMonthlyReport: bool(u.email_monthly_report),
      telegramChatId: u.telegramChatId || "",
      telegramDailyReport: bool(u.telegram_daily_report),
      telegramWeeklyReport: bool(u.telegram_weekly_report),
      telegramMonthlyReport: bool(u.telegram_monthly_report),
      telegramSkipWeekends: bool(u.telegram_skip_weekends),
      maxChatId: u.max_chat_id || "",
      maxDailyReport: bool(u.max_daily_report),
      maxManagerReport: bool(u.max_manager_report),
      reportIncludeCallSummaries: bool(u.report_include_call_summaries),
      reportDetailed: bool(u.report_detailed),
      reportIncludeAvgValue: bool(u.report_include_avg_value),
      reportIncludeAvgRating: bool(u.report_include_avg_rating),
      filterExcludeAnsweringMachine: bool(u.filter_exclude_answering_machine),
      filterMinDuration: Number(u.filter_min_duration) || 0,
      filterMinReplicas: Number(u.filter_min_replicas) || 0,
      kpiBaseSalary: Number(u.kpi_base_salary) || 0,
      kpiTargetBonus: Number(u.kpi_target_bonus) || 0,
      kpiTargetTalkTimeMinutes: Number(u.kpi_target_talk_time_minutes) || 0,
      reportDailyTime: _normTime(promptsMap.report_daily_time) || "18:00",
      reportWeeklyDay: (promptsMap.report_weekly_day || "fri").toLowerCase(),
      reportWeeklyTime: _normTime(promptsMap.report_weekly_time) || "18:10",
      reportMonthlyDay: promptsMap.report_monthly_day || "last",
      reportMonthlyTime: _normTime(promptsMap.report_monthly_time) || "18:20",
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
    const reportPayload = serializeReportSettingsForApi(form);
    const payload = {
      givenName: loadedUser?.givenName ?? getGivenName(user) ?? "",
      familyName: loadedUser?.familyName ?? getFamilyName(user) ?? "",
      internalExtensions:
        loadedUser?.internalExtensions ??
        getInternalExtensions(user) ??
        undefined,
      ...reportPayload,
    };
    try {
      await updateMutation.mutateAsync({
        user_id: userId,
        data: payload,
      });
      await updateMaxMutation.mutateAsync({
        user_id: userId,
        data: serializeMaxSettingsForApi(form),
      });
      if (isWorkspaceAdmin) {
        await updatePromptsMutation
          .mutateAsync({
            prompts: serializePromptsForApi(form),
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
