"use client";

import { paths } from "@calls/config";
import { toast } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useORPC } from "@/orpc/react";
import type {
  PbxEmployeeItem,
  PbxNumberItem,
  ReportType,
  SettingsState,
} from "../types";
import { getReportTypeLabel } from "../types";
import { useFtpSettings } from "./use-ftp";
import { useMegaPbxSettings } from "./use-megapbx";
import { useTelegramSettings } from "./use-telegram";

export function useSettings() {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<SettingsState>({
    ftp: {
      enabled: false,
      host: "",
      user: "",
      password: "",
      passwordSet: false,
      syncFromDate: "",
      excludePhoneNumbers: "",
    },
    integrations: {
      telegramBotToken: "",
      telegramUsesDefault: false,
      maxBotToken: "",
    },
    megaPbx: {
      enabled: false,
      baseUrl: "",
      apiKey: "",
      apiKeySet: false,
      syncFromDate: "",
      excludePhoneNumbers: "",
      webhookSecret: "",
      webhookSecretSet: false,
      ftpHost: "",
      ftpUser: "",
      ftpPassword: "",
      ftpPasswordSet: false,
      syncEmployees: false,
      syncNumbers: false,
      syncCalls: false,
      syncRecordings: false,
      webhooksEnabled: false,
    },
    loading: true,
    saving: false,
    backupLoading: false,
    sendTestLoading: false,
    sendTestReportType: null,
    sendTestMessage: "",
    ftpSaving: false,
    ftpTesting: false,
    ftpTestMessage: "",
    ftpConnectionStatus: null,
    ftpStatusLoading: false,
    telegramSaving: false,
    maxBotSaving: false,
    megaPbxSaving: false,
    megaPbxAccessSaving: false,
    megaPbxSyncOptionsSaving: false,
    megaPbxExcludedNumbersSaving: false,
    megaPbxWebhookSaving: false,
    megaPbxTesting: false,
    megaPbxSyncing: null,
    megaPbxTestMessage: "",
    megaPbxEmployeesLoading: false,
    megaPbxNumbersLoading: false,
    megaPbxEmployees: [],
    megaPbxNumbers: [],
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const ftpSettings = useFtpSettings({
    state: {
      ftp: state.ftp,
      ftpSaving: state.ftpSaving,
      ftpTesting: state.ftpTesting,
      ftpTestMessage: state.ftpTestMessage,
      ftpConnectionStatus: state.ftpConnectionStatus,
      ftpStatusLoading: state.ftpStatusLoading,
    },
    setState,
  });

  const telegramSettings = useTelegramSettings({
    state: {
      integrations: state.integrations,
      telegramSaving: state.telegramSaving,
      maxBotSaving: state.maxBotSaving,
    },
    setState,
  });

  const megaPbxSettings = useMegaPbxSettings({
    state: {
      megaPbx: state.megaPbx,
      megaPbxSaving: state.megaPbxSaving,
      megaPbxAccessSaving: state.megaPbxAccessSaving,
      megaPbxSyncOptionsSaving: state.megaPbxSyncOptionsSaving,
      megaPbxExcludedNumbersSaving: state.megaPbxExcludedNumbersSaving,
      megaPbxWebhookSaving: state.megaPbxWebhookSaving,
      megaPbxTesting: state.megaPbxTesting,
      megaPbxSyncing: state.megaPbxSyncing,
      megaPbxTestMessage: state.megaPbxTestMessage,
      megaPbxEmployeesLoading: state.megaPbxEmployeesLoading,
      megaPbxNumbersLoading: state.megaPbxNumbersLoading,
      megaPbxEmployees: state.megaPbxEmployees,
      megaPbxNumbers: state.megaPbxNumbers,
    },
    setState,
  });

  const loadSettings = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const user = await getCurrentUser();
      if (!user) {
        router.push(paths.auth.signin);
        return;
      }
      setCurrentUser(user);

      const [integrations, megaPbx, megaPbxEmployees, megaPbxNumbers] =
        await Promise.all([
          queryClient.fetchQuery(orpc.settings.getIntegrations.queryOptions()),
          queryClient.fetchQuery(orpc.settings.getPbx.queryOptions()),
          queryClient.fetchQuery(orpc.settings.listPbxEmployees.queryOptions()),
          queryClient.fetchQuery(orpc.settings.listPbxNumbers.queryOptions()),
        ]);
      const ftp = integrations.ftp;
      const ftpConfigured =
        Boolean(ftp.host?.trim()) &&
        Boolean(ftp.user?.trim()) &&
        ftp.passwordSet;
      setState((prev) => ({
        ...prev,
        ftp: {
          enabled: ftp.enabled,
          host: ftp.host ?? "",
          user: ftp.user ?? "",
          password: "",
          passwordSet: ftp.passwordSet,
          syncFromDate: ftp.syncFromDate ?? "",
          excludePhoneNumbers: Array.isArray(ftp.excludePhoneNumbers)
            ? ftp.excludePhoneNumbers.join("\n")
            : "",
        },
        integrations: {
          telegramBotToken: integrations.telegram_bot_token ?? "",
          telegramUsesDefault: Boolean(integrations.telegram_uses_default),
          maxBotToken: integrations.max_bot_token ?? "",
        },
        megaPbx: {
          enabled: megaPbx.enabled,
          baseUrl: megaPbx.baseUrl ?? "",
          apiKey: "",
          apiKeySet: megaPbx.apiKeySet,
          syncFromDate: megaPbx.syncFromDate ?? "",
          excludePhoneNumbers: Array.isArray(megaPbx.excludePhoneNumbers)
            ? megaPbx.excludePhoneNumbers.join("\n")
            : "",
          webhookSecret: "",
          webhookSecretSet: megaPbx.webhookSecretSet,
          ftpHost: megaPbx.ftpHost ?? "",
          ftpUser: megaPbx.ftpUser ?? "",
          ftpPassword: "",
          ftpPasswordSet: megaPbx.ftpPasswordSet,
          syncEmployees: megaPbx.syncEmployees,
          syncNumbers: megaPbx.syncNumbers,
          syncCalls: megaPbx.syncCalls,
          syncRecordings: megaPbx.syncRecordings,
          webhooksEnabled: megaPbx.webhooksEnabled,
        },
        ftpStatusLoading: ftpConfigured,
        ftpConnectionStatus: null,
        megaPbxEmployees: megaPbxEmployees as PbxEmployeeItem[],
        megaPbxNumbers: megaPbxNumbers as PbxNumberItem[],
      }));

      if (ftpConfigured) {
        try {
          const status = await queryClient.fetchQuery(
            orpc.settings.checkFtpStatus.queryOptions(),
          );
          setState((prev) => ({
            ...prev,
            ftpConnectionStatus: status,
            ftpStatusLoading: false,
          }));
        } catch {
          setState((prev) => ({
            ...prev,
            ftpConnectionStatus: null,
            ftpStatusLoading: false,
          }));
        }
      } else {
        setState((prev) => ({
          ...prev,
          ftpConnectionStatus: null,
          ftpStatusLoading: false,
        }));
      }
    } catch (error: unknown) {
      console.error("Failed to load settings:", error);
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "FORBIDDEN"
      ) {
        router.push(paths.forbidden);
      }
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [orpc, queryClient, router]);

  const backupMutation = useMutation(orpc.settings.backup.mutationOptions());

  const sendTestTelegramMutation = useMutation(
    orpc.reports.sendTestTelegram.mutationOptions(),
  );

  const handleBackup = async () => {
    if (state.backupLoading) return;
    try {
      setState((prev) => ({ ...prev, backupLoading: true }));
      const res = await backupMutation.mutateAsync(undefined);
      const path = res?.path ?? "";
      toast.success(`Резервная копия создана: ${path}`);
    } catch (error: unknown) {
      const msg =
        (error instanceof Error ? error.message : String(error)) ||
        "Не удалось создать резервную копию";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setState((prev) => ({ ...prev, backupLoading: false }));
    }
  };

  const handleSendTest = async (reportType: ReportType) => {
    setState((prev) => ({
      ...prev,
      sendTestMessage: "",
      sendTestLoading: true,
      sendTestReportType: reportType,
    }));
    try {
      await sendTestTelegramMutation.mutateAsync({ reportType });
      const reportTypeLabel = getReportTypeLabel(reportType);
      setState((prev) => ({
        ...prev,
        sendTestMessage: `${reportTypeLabel} отчёт отправлен в Telegram`,
      }));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, sendTestMessage: "" }));
        timeoutRef.current = null;
      }, 4000);
    } catch (err: unknown) {
      const e = err as Error;
      const msg =
        e instanceof Error
          ? e.message
          : "Не удалось отправить. Укажите Telegram Chat ID в настройках отчётов.";
      setState((prev) => ({
        ...prev,
        sendTestMessage: msg,
      }));
    } finally {
      setState((prev) => ({
        ...prev,
        sendTestLoading: false,
        sendTestReportType: null,
      }));
    }
  };

  return {
    currentUser,
    state,
    setState,
    loadSettings,
    ...telegramSettings,
    ...ftpSettings,
    ...megaPbxSettings,
    handleBackup,
    handleSendTest,
  };
}
