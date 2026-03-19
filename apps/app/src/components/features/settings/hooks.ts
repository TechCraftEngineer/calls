"use client";

import { paths } from "@calls/config";
import { validateTelegramBotToken } from "@calls/shared";
import { toast } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { getCurrentUser, type User } from "@/lib/auth";
import { useORPC } from "@/orpc/react";
import type {
  AccessFormData,
  SyncOptionsFormData,
  WebhookFormData,
} from "./megapbx/schemas";
import {
  getReportTypeLabel,
  type PbxEmployeeItem,
  type PbxNumberItem,
  type ReportType,
  type SettingsState,
} from "./types";
import {
  validateFtpCredentials,
  validateFtpHost,
  validateFtpUser,
} from "./utils";

export function useSettings() {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  const loadSettings = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      const user = await getCurrentUser();
      if (!user) {
        router.push(paths.auth.signin);
        return;
      }
      setCurrentUser(user as unknown as User);

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

  const updateIntegrationsMutation = useMutation(
    orpc.settings.updateIntegrations.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getIntegrations.queryKey(),
        });
      },
    }),
  );

  const updateFtpMutation = useMutation(
    orpc.settings.updateFtp.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getIntegrations.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.settings.checkFtpStatus.queryKey(),
        });
      },
    }),
  );

  const testFtpMutation = useMutation(orpc.settings.testFtp.mutationOptions());
  const invalidatePbx = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: orpc.settings.getPbx.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: orpc.settings.getIntegrations.queryKey(),
    });
  }, [orpc, queryClient]);

  const updatePbxMutation = useMutation(
    orpc.settings.updatePbx.mutationOptions({ onSuccess: invalidatePbx }),
  );
  const updatePbxAccessMutation = useMutation(
    orpc.settings.updatePbxAccess.mutationOptions({ onSuccess: invalidatePbx }),
  );
  const updatePbxSyncOptionsMutation = useMutation(
    orpc.settings.updatePbxSyncOptions.mutationOptions({
      onSuccess: invalidatePbx,
    }),
  );
  const updatePbxExcludedNumbersMutation = useMutation(
    orpc.settings.updatePbxExcludedNumbers.mutationOptions({
      onSuccess: invalidatePbx,
    }),
  );
  const updatePbxWebhookMutation = useMutation(
    orpc.settings.updatePbxWebhook.mutationOptions({
      onSuccess: invalidatePbx,
    }),
  );
  const testPbxMutation = useMutation(orpc.settings.testPbx.mutationOptions());
  const syncPbxDirectoryMutation = useMutation(
    orpc.settings.syncPbxDirectory.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxEmployees.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxNumbers.queryKey(),
        });
      },
    }),
  );
  const syncPbxCallsMutation = useMutation(
    orpc.settings.syncPbxCalls.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getPbx.queryKey(),
        });
      },
    }),
  );
  const syncPbxRecordingsMutation = useMutation(
    orpc.settings.syncPbxRecordings.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getPbx.queryKey(),
        });
      },
    }),
  );
  const refetchPbxLists = useCallback(async () => {
    const [employees, numbers] = await Promise.all([
      queryClient.fetchQuery(orpc.settings.listPbxEmployees.queryOptions()),
      queryClient.fetchQuery(orpc.settings.listPbxNumbers.queryOptions()),
    ]);
    setState((prev) => ({
      ...prev,
      megaPbxEmployees: employees as PbxEmployeeItem[],
      megaPbxNumbers: numbers as PbxNumberItem[],
    }));
  }, [orpc, queryClient]);

  const linkPbxUserMutation = useMutation(
    orpc.settings.linkPbxUser.mutationOptions({
      onSuccess: refetchPbxLists,
    }),
  );
  const unlinkPbxUserMutation = useMutation(
    orpc.settings.unlinkPbxUser.mutationOptions({
      onSuccess: refetchPbxLists,
    }),
  );

  const backupMutation = useMutation(orpc.settings.backup.mutationOptions());

  const sendTestTelegramMutation = useMutation(
    orpc.reports.sendTestTelegram.mutationOptions(),
  );

  const handleSaveTelegram = async () => {
    const telegramToken = state.integrations.telegramBotToken.trim();
    if (telegramToken) {
      const validation = validateTelegramBotToken(telegramToken);
      if (!validation.isValid && validation.error) {
        toast.error(validation.error);
        return;
      }
    }

    try {
      setState((prev) => ({ ...prev, telegramSaving: true }));
      await updateIntegrationsMutation.mutateAsync({
        telegram_bot_token: state.integrations.telegramBotToken || null,
      });
      toast.success("Telegram Bot сохранён");
    } catch (error: unknown) {
      console.error("Failed to save Telegram:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить настройки Telegram";
      toast.error(msg);
    } finally {
      setState((prev) => ({ ...prev, telegramSaving: false }));
    }
  };

  const handleSaveMaxBot = async () => {
    try {
      setState((prev) => ({ ...prev, maxBotSaving: true }));
      await updateIntegrationsMutation.mutateAsync({
        max_bot_token: state.integrations.maxBotToken || null,
      });
      toast.success("MAX Bot сохранён");
    } catch (error: unknown) {
      console.error("Failed to save MAX Bot:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить настройки MAX Bot";
      toast.error(msg);
    } finally {
      setState((prev) => ({ ...prev, maxBotSaving: false }));
    }
  };

  const handleSaveFtp = async () => {
    try {
      setState((prev) => ({ ...prev, ftpSaving: true }));
      const { enabled, host, user, password, passwordSet } = state.ftp;

      if (host || user || password) {
        if (password.trim()) {
          const ftpValidation = validateFtpCredentials(host, user, password);
          if (!ftpValidation.isValid) {
            toast.error(ftpValidation.errors.join(". "));
            return;
          }
        } else if (passwordSet) {
          const hostValidation = validateFtpHost(host);
          const userValidation = validateFtpUser(user);
          const errors = [hostValidation.error, userValidation.error].filter(
            Boolean,
          );
          if (errors.length > 0) {
            toast.error(errors.join(". "));
            return;
          }
        } else {
          const ftpValidation = validateFtpCredentials(host, user, password);
          if (!ftpValidation.isValid) {
            toast.error(ftpValidation.errors.join(". "));
            return;
          }
        }
      }

      const syncFromDate = state.ftp.syncFromDate.trim();
      const excludeRaw = state.ftp.excludePhoneNumbers.trim();
      const excludePhoneNumbers = excludeRaw
        ? excludeRaw
            .split(/[\n,;]+/)
            .map((n) => n.trim())
            .filter(Boolean)
        : [];
      await updateFtpMutation.mutateAsync({
        enabled,
        host,
        user,
        password,
        syncFromDate:
          syncFromDate && /^\d{4}-\d{2}-\d{2}$/.test(syncFromDate)
            ? syncFromDate
            : undefined,
        excludePhoneNumbers,
      });
      toast.success("Параметры подключения FTP сохранены");
    } catch (error: unknown) {
      console.error("Failed to save FTP:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить параметры FTP";
      toast.error(msg);
    } finally {
      setState((prev) => ({ ...prev, ftpSaving: false }));
    }
  };

  const handleTestFtp = async () => {
    try {
      setState((prev) => ({
        ...prev,
        ftpTestMessage: "",
        ftpTesting: true,
      }));
      const { host, user, password, passwordSet } = state.ftp;

      if (passwordSet && !password.trim()) {
        setState((prev) => ({
          ...prev,
          ftpTestMessage: "Введите пароль для проверки подключения",
        }));
        return;
      }

      const ftpValidation = validateFtpCredentials(host, user, password);
      if (!ftpValidation.isValid) {
        setState((prev) => ({
          ...prev,
          ftpTestMessage: ftpValidation.errors.join(". "),
        }));
        return;
      }

      const result = await testFtpMutation.mutateAsync({
        host,
        user,
        password,
      });

      if (result.success) {
        setState((prev) => ({
          ...prev,
          ftpTestMessage: "Подключение установлено. Учётные данные корректны.",
          ftpConnectionStatus: {
            configured: true,
            success: true,
            message: "Подключено",
          },
        }));
      } else {
        setState((prev) => ({
          ...prev,
          ftpTestMessage: result.message,
          ftpConnectionStatus: {
            configured: true,
            success: false,
            message: result.message,
          },
        }));
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось проверить подключение";
      setState((prev) => ({
        ...prev,
        ftpTestMessage: msg,
      }));
    } finally {
      setState((prev) => ({ ...prev, ftpTesting: false }));
    }
  };

  const megaPbxPayload = () => ({
    excludePhoneNumbers: (state.megaPbx.excludePhoneNumbers ?? "")
      .split(/[\n,;]+/)
      .map((value) => value.replace(/\D/g, ""))
      .filter(Boolean),
    enabled: state.megaPbx.enabled,
    baseUrl: state.megaPbx.baseUrl,
    apiKey: state.megaPbx.apiKey,
    syncFromDate: state.megaPbx.syncFromDate.trim(),
    webhookSecret: state.megaPbx.webhookSecret,
    ftpHost: state.megaPbx.ftpHost,
    ftpUser: state.megaPbx.ftpUser,
    ftpPassword: state.megaPbx.ftpPassword,
    syncEmployees: state.megaPbx.syncEmployees,
    syncNumbers: state.megaPbx.syncNumbers,
    syncCalls: state.megaPbx.syncCalls,
    syncRecordings: state.megaPbx.syncRecordings,
    webhooksEnabled: state.megaPbx.webhooksEnabled,
  });

  const refreshSettingsState = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  const refreshPbxSettings = useCallback(async () => {
    const [megaPbx, megaPbxEmployees, megaPbxNumbers] =
      await Promise.all([
        queryClient.fetchQuery(orpc.settings.getPbx.queryOptions()),
        queryClient.fetchQuery(orpc.settings.listPbxEmployees.queryOptions()),
        queryClient.fetchQuery(orpc.settings.listPbxNumbers.queryOptions()),
      ]);
    
    setState((prev) => ({
      ...prev,
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
      megaPbxEmployees: megaPbxEmployees as PbxEmployeeItem[],
      megaPbxNumbers: megaPbxNumbers as PbxNumberItem[],
    }));
  }, [orpc, queryClient]);

  const handleSavePbx = async () => {
    try {
      setState((prev) => ({ ...prev, megaPbxSaving: true }));
      await updatePbxMutation.mutateAsync(megaPbxPayload());
      await refreshPbxSettings();
      toast.success("MegaPBX настройки сохранены");
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить настройки MegaPBX";
      toast.error(msg);
    } finally {
      setState((prev) => ({ ...prev, megaPbxSaving: false }));
    }
  };

  const handleSavePbxAccess = async (payload: AccessFormData) => {
    try {
      setState((prev) => ({ ...prev, megaPbxAccessSaving: true }));
      await updatePbxAccessMutation.mutateAsync({
        enabled: state.megaPbx.enabled,
        baseUrl: payload.baseUrl.trim(),
        apiKey: payload.apiKey?.trim() || undefined,
        syncFromDate: payload.syncFromDate?.trim() || undefined,
      });
      await refreshPbxSettings();
      toast.success("Доступ к API сохранён");
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить доступ к API";
      toast.error(msg);
    } finally {
      setState((prev) => ({ ...prev, megaPbxAccessSaving: false }));
    }
  };

  const handleSavePbxSyncOptions = async (payload: SyncOptionsFormData) => {
    try {
      setState((prev) => ({ ...prev, megaPbxSyncOptionsSaving: true }));
      await updatePbxSyncOptionsMutation.mutateAsync(payload);
      await refreshPbxSettings();
      toast.success("Настройки синхронизации сохранены");
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить настройки синхронизации";
      toast.error(msg);
      throw error;
    } finally {
      setState((prev) => ({ ...prev, megaPbxSyncOptionsSaving: false }));
    }
  };

  const handleSavePbxExcludedNumbers = async (
    excludePhoneNumbers: string[],
  ) => {
    try {
      setState((prev) => ({ ...prev, megaPbxExcludedNumbersSaving: true }));
      const normalized = Array.from(
        new Set(
          excludePhoneNumbers
            .map((value) => value.replace(/\D/g, ""))
            .filter(Boolean),
        ),
      );
      await updatePbxExcludedNumbersMutation.mutateAsync({
        excludePhoneNumbers: normalized,
      });
      setState((prev) => ({
        ...prev,
        megaPbx: {
          ...prev.megaPbx,
          excludePhoneNumbers: normalized.join("\n"),
        },
      }));
      await refreshPbxSettings();
      toast.success("Исключённые номера сохранены");
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить исключённые номера";
      toast.error(msg);
    } finally {
      setState((prev) => ({ ...prev, megaPbxExcludedNumbersSaving: false }));
    }
  };

  const handleSavePbxWebhook = async (payload: WebhookFormData) => {
    try {
      setState((prev) => ({ ...prev, megaPbxWebhookSaving: true }));
      const trimmedSecret = payload.webhookSecret?.trim();
      await updatePbxWebhookMutation.mutateAsync(
        trimmedSecret ? { webhookSecret: trimmedSecret } : {},
      );
      await refreshPbxSettings();
      toast.success("Webhook сохранён");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Не удалось сохранить webhook";
      toast.error(msg);
    } finally {
      setState((prev) => ({ ...prev, megaPbxWebhookSaving: false }));
    }
  };

  const handleTestPbx = async (baseUrl?: string, apiKey?: string) => {
    const url = baseUrl ?? state.megaPbx.baseUrl;
    const key = apiKey ?? state.megaPbx.apiKey;
    try {
      setState((prev) => ({
        ...prev,
        megaPbxTesting: true,
        megaPbxTestMessage: "",
      }));
      const result = await testPbxMutation.mutateAsync({
        baseUrl: url,
        apiKey: key,
      });
      const ok =
        result !== null &&
        typeof result === "object" &&
        "success" in result &&
        result.success === true;
      const failText = (() => {
        if (!result || typeof result !== "object") {
          return "Неизвестный ответ сервера";
        }
        if ("error" in result && typeof result.error === "string") {
          return result.error.trim() || "Проверка не пройдена";
        }
        if (
          "message" in result &&
          typeof (result as { message?: unknown }).message === "string"
        ) {
          const m = (result as { message: string }).message.trim();
          return m || "Проверка не пройдена";
        }
        return ok ? "" : "Проверка не пройдена";
      })();
      const message = ok ? "Подключение к MegaPBX успешно" : failText;
      setState((prev) => ({ ...prev, megaPbxTestMessage: message }));
      if (ok) toast.success(message);
      else toast.error(message);
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось проверить подключение к MegaPBX";
      setState((prev) => ({ ...prev, megaPbxTestMessage: msg }));
      toast.error(msg);
    } finally {
      setState((prev) => ({ ...prev, megaPbxTesting: false }));
    }
  };

  const runPbxSync = async (type: "directory" | "calls") => {
    try {
      setState((prev) => ({ ...prev, megaPbxSyncing: type }));
      if (type === "directory") {
        await syncPbxDirectoryMutation.mutateAsync(undefined);
      } else {
        // Для "calls" теперь синхронизируем и историю, и записи вместе
        await syncPbxCallsMutation.mutateAsync(undefined);
      }
      const message = type === "directory" 
        ? "Синхронизация справочника MegaPBX поставлена в очередь"
        : "Синхронизация звонков и записей MegaPBX поставлена в очередь";
      toast.success(message);
      // Задача выполняется в Inngest — через 5 сек обновляем сотрудников и номера
      if (type === "directory") {
        setTimeout(() => {
          refetchPbxLists().catch(() => {
            // Игнорируем — данные обновятся при следующей загрузке
          });
        }, 5000);
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Ошибка синхронизации MegaPBX";
      toast.error(msg);
    } finally {
      setState((prev) => ({ ...prev, megaPbxSyncing: null }));
    }
  };

  const handleLinkPbxTarget = async (input: {
    targetType: "employee" | "number";
    targetExternalId: string;
    userId?: string | null;
    invitationId?: string | null;
  }) => {
    await linkPbxUserMutation.mutateAsync(input);
  };

  const handleUnlinkPbxTarget = async (input: {
    targetType: "employee" | "number";
    targetExternalId: string;
  }) => {
    await unlinkPbxUserMutation.mutateAsync(input);
  };

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
      setTimeout(() => {
        setState((prev) => ({ ...prev, sendTestMessage: "" }));
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

  const setTelegramBotToken = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const value = e.target.value;
    setState((prev) => ({
      ...prev,
      integrations: { ...prev.integrations, telegramBotToken: value },
    }));
  };

  const setMaxBotToken = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const value = e.target.value;
    setState((prev) => ({
      ...prev,
      integrations: { ...prev.integrations, maxBotToken: value },
    }));
  };

  const setFtpField =
    (key: "host" | "user" | "password" | "excludePhoneNumbers") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setState((prev) => ({
        ...prev,
        ftp: { ...prev.ftp, [key]: value },
      }));
    };

  const setFtpSyncFromDate = (value: string) => {
    setState((prev) => ({
      ...prev,
      ftp: { ...prev.ftp, syncFromDate: value },
    }));
  };

  const setFtpEnabled = (enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      ftp: { ...prev.ftp, enabled },
    }));
  };

  const setMegaPbxEnabled = (checked: boolean) => {
    setState((prev) => ({
      ...prev,
      megaPbx: { ...prev.megaPbx, enabled: checked },
    }));
    const runUpdate = async () => {
      try {
        setState((prev) => ({ ...prev, megaPbxSaving: true }));
        await updatePbxMutation.mutateAsync({
          ...megaPbxPayload(),
          enabled: checked,
        });
        toast.success(checked ? "Интеграция включена" : "Интеграция выключена");
      } catch (error) {
        setState((prev) => ({
          ...prev,
          megaPbx: { ...prev.megaPbx, enabled: !checked },
        }));
        const msg =
          error instanceof Error
            ? error.message
            : "Не удалось обновить интеграцию";
        toast.error(msg);
      } finally {
        setState((prev) => ({ ...prev, megaPbxSaving: false }));
      }
    };
    runUpdate();
  };

  return {
    currentUser,
    state,
    loadSettings,
    handleSaveTelegram,
    handleSaveMaxBot,
    handleSaveFtp,
    handleTestFtp,
    handleSavePbx,
    handleSavePbxAccess,
    handleSavePbxSyncOptions,
    handleSavePbxExcludedNumbers,
    handleSavePbxWebhook,
    handleTestPbx,
    handleSyncPbxDirectory: () => runPbxSync("directory"),
    handleSyncPbxCalls: () => runPbxSync("calls"),
    handleLinkPbxTarget,
    handleUnlinkPbxTarget,
    handleSaveMegaPbx: handleSavePbx,
    handleTestMegaPbx: handleTestPbx,
    handleSyncMegaPbxDirectory: () => runPbxSync("directory"),
    handleSyncMegaPbxCalls: () => runPbxSync("calls"),
    handleLinkMegaPbxTarget: handleLinkPbxTarget,
    handleUnlinkMegaPbxTarget: handleUnlinkPbxTarget,
    handleBackup,
    handleSendTest,
    setTelegramBotToken,
    setMaxBotToken,
    setFtpField,
    setFtpSyncFromDate,
    setFtpEnabled,
    setMegaPbxEnabled,
  };
}
