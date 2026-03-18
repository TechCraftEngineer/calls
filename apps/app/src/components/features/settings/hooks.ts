"use client";

import { paths } from "@calls/config";
import { validateTelegramBotToken } from "@calls/shared";
import { toast } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { getCurrentUser, type User } from "@/lib/auth";
import { useORPC } from "@/orpc/react";
import { INTEGRATION_KEYS } from "./constants";
import {
  getReportTypeLabel,
  type PbxEmployeeItem,
  type PbxNumberItem,
  type Prompt,
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
    prompts: {},
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
      const promptsMap: Record<string, Prompt> = {};

      // Добавляем интеграции (FTP, Telegram, MAX Bot)
      const ftp = integrations.ftp;
      promptsMap.ftp_enabled = {
        key: "ftp_enabled",
        value: ftp.enabled ? "true" : "false",
        description: "FTP включён",
        updated_at: undefined,
      };
      promptsMap.ftp_host = {
        key: "ftp_host",
        value: ftp.host ?? "",
        description: "Хост FTP",
        updated_at: undefined,
      };
      promptsMap.ftp_user = {
        key: "ftp_user",
        value: ftp.user ?? "",
        description: "Пользователь FTP",
        updated_at: undefined,
      };
      promptsMap.ftp_password = {
        key: "ftp_password",
        value: "",
        description: "Пароль FTP",
        updated_at: undefined,
        meta: { passwordSet: ftp.passwordSet },
      };
      promptsMap.ftp_sync_from_date = {
        key: "ftp_sync_from_date",
        value: ftp.syncFromDate ?? "",
        description: "С какой даты выгружать",
        updated_at: undefined,
      };
      promptsMap.ftp_exclude_phone_numbers = {
        key: "ftp_exclude_phone_numbers",
        value: Array.isArray(ftp.excludePhoneNumbers)
          ? ftp.excludePhoneNumbers.join("\n")
          : "",
        description: "Номера, исключённые из загрузки и анализа",
        updated_at: undefined,
      };
      promptsMap.telegram_bot_token = {
        key: "telegram_bot_token",
        value: integrations.telegram_bot_token ?? "",
        description: "Токен Telegram-бота",
        updated_at: undefined,
      };
      promptsMap.max_bot_token = {
        key: "max_bot_token",
        value: integrations.max_bot_token ?? "",
        description: "Токен MAX-бота",
        updated_at: undefined,
      };
      promptsMap.megapbx_enabled = {
        key: "megapbx_enabled",
        value: megaPbx.enabled ? "true" : "false",
        description: "MegaPBX включён",
        updated_at: undefined,
      };
      promptsMap.megapbx_base_url = {
        key: "megapbx_base_url",
        value: megaPbx.baseUrl ?? "",
        description: "Base URL MegaPBX",
        updated_at: undefined,
      };
      promptsMap.megapbx_api_key = {
        key: "megapbx_api_key",
        value: "",
        description: "API key MegaPBX",
        updated_at: undefined,
        meta: { passwordSet: megaPbx.apiKeySet },
      };
      promptsMap.megapbx_auth_scheme = {
        key: "megapbx_auth_scheme",
        value: megaPbx.authScheme ?? "bearer",
        description: "Схема авторизации",
        updated_at: undefined,
      };
      promptsMap.megapbx_api_key_header = {
        key: "megapbx_api_key_header",
        value: megaPbx.apiKeyHeader ?? "X-API-Key",
        description: "Имя заголовка для API key",
        updated_at: undefined,
      };
      promptsMap.megapbx_employees_path = {
        key: "megapbx_employees_path",
        value: megaPbx.employeesPath ?? "",
        description: "Путь для списка сотрудников",
        updated_at: undefined,
      };
      promptsMap.megapbx_employees_result_key = {
        key: "megapbx_employees_result_key",
        value: megaPbx.employeesResultKey ?? "",
        description: "Ключ массива сотрудников",
        updated_at: undefined,
      };
      promptsMap.megapbx_numbers_path = {
        key: "megapbx_numbers_path",
        value: megaPbx.numbersPath ?? "",
        description: "Путь для списка номеров",
        updated_at: undefined,
      };
      promptsMap.megapbx_numbers_result_key = {
        key: "megapbx_numbers_result_key",
        value: megaPbx.numbersResultKey ?? "",
        description: "Ключ массива номеров",
        updated_at: undefined,
      };
      promptsMap.megapbx_calls_path = {
        key: "megapbx_calls_path",
        value: megaPbx.callsPath ?? "",
        description: "Путь для списка звонков",
        updated_at: undefined,
      };
      promptsMap.megapbx_calls_result_key = {
        key: "megapbx_calls_result_key",
        value: megaPbx.callsResultKey ?? "",
        description: "Ключ массива звонков",
        updated_at: undefined,
      };
      promptsMap.megapbx_recordings_path = {
        key: "megapbx_recordings_path",
        value: megaPbx.recordingsPath ?? "",
        description: "Путь для записей/метаданных записей",
        updated_at: undefined,
      };
      promptsMap.megapbx_recordings_result_key = {
        key: "megapbx_recordings_result_key",
        value: megaPbx.recordingsResultKey ?? "",
        description: "Ключ массива записей",
        updated_at: undefined,
      };
      promptsMap.megapbx_webhook_path = {
        key: "megapbx_webhook_path",
        value: megaPbx.webhookPath ?? "",
        description: "Путь регистрации вебхука",
        updated_at: undefined,
      };
      promptsMap.megapbx_webhook_secret = {
        key: "megapbx_webhook_secret",
        value: "",
        description: "Секрет вебхука",
        updated_at: undefined,
        meta: { passwordSet: megaPbx.webhookSecretSet },
      };
      promptsMap.megapbx_ftp_host = {
        key: "megapbx_ftp_host",
        value: megaPbx.ftpHost ?? "",
        description: "FTP host для записей",
        updated_at: undefined,
      };
      promptsMap.megapbx_ftp_user = {
        key: "megapbx_ftp_user",
        value: megaPbx.ftpUser ?? "",
        description: "FTP user для записей",
        updated_at: undefined,
      };
      promptsMap.megapbx_ftp_password = {
        key: "megapbx_ftp_password",
        value: "",
        description: "FTP password для записей",
        updated_at: undefined,
        meta: { passwordSet: megaPbx.ftpPasswordSet },
      };
      promptsMap.megapbx_sync_employees = {
        key: "megapbx_sync_employees",
        value: megaPbx.syncEmployees ? "true" : "false",
        description: "Синхронизировать сотрудников",
        updated_at: undefined,
      };
      promptsMap.megapbx_sync_numbers = {
        key: "megapbx_sync_numbers",
        value: megaPbx.syncNumbers ? "true" : "false",
        description: "Синхронизировать номера",
        updated_at: undefined,
      };
      promptsMap.megapbx_sync_calls = {
        key: "megapbx_sync_calls",
        value: megaPbx.syncCalls ? "true" : "false",
        description: "Синхронизировать звонки",
        updated_at: undefined,
      };
      promptsMap.megapbx_sync_recordings = {
        key: "megapbx_sync_recordings",
        value: megaPbx.syncRecordings ? "true" : "false",
        description: "Скачивать записи",
        updated_at: undefined,
      };
      promptsMap.megapbx_webhooks_enabled = {
        key: "megapbx_webhooks_enabled",
        value: megaPbx.webhooksEnabled ? "true" : "false",
        description: "Включить вебхуки",
        updated_at: undefined,
      };

      Object.keys(INTEGRATION_KEYS).forEach((key) => {
        if (!promptsMap[key]) {
          promptsMap[key] = {
            key,
            value: "",
            description: "",
            updated_at: undefined,
          };
        }
      });

      const ftpConfigured =
        Boolean(ftp.host?.trim()) &&
        Boolean(ftp.user?.trim()) &&
        ftp.passwordSet;
      setState((prev) => ({
        ...prev,
        prompts: promptsMap,
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
  const updatePbxMutation = useMutation(
    orpc.settings.updatePbx.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getPbx.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getIntegrations.queryKey(),
        });
      },
    }),
  );
  const testPbxMutation = useMutation(orpc.settings.testPbx.mutationOptions());
  const syncPbxDirectoryMutation = useMutation(
    orpc.settings.syncPbxDirectory.mutationOptions(),
  );
  const syncPbxCallsMutation = useMutation(
    orpc.settings.syncPbxCalls.mutationOptions(),
  );
  const syncPbxRecordingsMutation = useMutation(
    orpc.settings.syncPbxRecordings.mutationOptions(),
  );
  const linkPbxUserMutation = useMutation(
    orpc.settings.linkPbxUser.mutationOptions(),
  );
  const unlinkPbxUserMutation = useMutation(
    orpc.settings.unlinkPbxUser.mutationOptions(),
  );

  const backupMutation = useMutation(orpc.settings.backup.mutationOptions());

  const sendTestTelegramMutation = useMutation(
    orpc.reports.sendTestTelegram.mutationOptions(),
  );

  const handleSaveTelegram = async () => {
    const telegramToken = state.prompts.telegram_bot_token?.value?.trim();
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
        telegram_bot_token: state.prompts.telegram_bot_token?.value ?? null,
      });
      toast.success("Telegram Bot сохранён");
      await loadSettings();
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
        max_bot_token: state.prompts.max_bot_token?.value ?? null,
      });
      toast.success("MAX Bot сохранён");
      await loadSettings();
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
      const enabled = state.prompts.ftp_enabled?.value === "true";
      const host = state.prompts.ftp_host?.value ?? "";
      const user = state.prompts.ftp_user?.value ?? "";
      const password = state.prompts.ftp_password?.value ?? "";

      if (host || user || password) {
        if (password.trim()) {
          const ftpValidation = validateFtpCredentials(host, user, password);
          if (!ftpValidation.isValid) {
            toast.error(ftpValidation.errors.join(". "));
            return;
          }
        } else if (state.prompts.ftp_password?.meta?.passwordSet) {
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

      const syncFromDate = state.prompts.ftp_sync_from_date?.value?.trim();
      const excludeRaw =
        state.prompts.ftp_exclude_phone_numbers?.value?.trim() ?? "";
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
      await loadSettings();
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
      const host = state.prompts.ftp_host?.value ?? "";
      const user = state.prompts.ftp_user?.value ?? "";
      const password = state.prompts.ftp_password?.value ?? "";
      const passwordSet = state.prompts.ftp_password?.meta?.passwordSet;

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
    enabled: state.prompts.megapbx_enabled?.value === "true",
    baseUrl: state.prompts.megapbx_base_url?.value ?? "",
    apiKey: state.prompts.megapbx_api_key?.value ?? "",
    authScheme:
      (state.prompts.megapbx_auth_scheme?.value as
        | "bearer"
        | "x-api-key"
        | "query") ?? "bearer",
    apiKeyHeader: state.prompts.megapbx_api_key_header?.value ?? "X-API-Key",
    employeesPath: state.prompts.megapbx_employees_path?.value ?? "",
    employeesMethod: "GET" as const,
    employeesResultKey: state.prompts.megapbx_employees_result_key?.value ?? "",
    numbersPath: state.prompts.megapbx_numbers_path?.value ?? "",
    numbersMethod: "GET" as const,
    numbersResultKey: state.prompts.megapbx_numbers_result_key?.value ?? "",
    callsPath: state.prompts.megapbx_calls_path?.value ?? "",
    callsMethod: "GET" as const,
    callsResultKey: state.prompts.megapbx_calls_result_key?.value ?? "",
    recordingsPath: state.prompts.megapbx_recordings_path?.value ?? "",
    recordingsMethod: "GET" as const,
    recordingsResultKey:
      state.prompts.megapbx_recordings_result_key?.value ?? "",
    webhookPath: state.prompts.megapbx_webhook_path?.value ?? "",
    webhookSecret: state.prompts.megapbx_webhook_secret?.value ?? "",
    ftpHost: state.prompts.megapbx_ftp_host?.value ?? "",
    ftpUser: state.prompts.megapbx_ftp_user?.value ?? "",
    ftpPassword: state.prompts.megapbx_ftp_password?.value ?? "",
    syncEmployees: state.prompts.megapbx_sync_employees?.value === "true",
    syncNumbers: state.prompts.megapbx_sync_numbers?.value === "true",
    syncCalls: state.prompts.megapbx_sync_calls?.value === "true",
    syncRecordings: state.prompts.megapbx_sync_recordings?.value === "true",
    webhooksEnabled: state.prompts.megapbx_webhooks_enabled?.value === "true",
  });

  const handleSavePbx = async () => {
    try {
      setState((prev) => ({ ...prev, megaPbxSaving: true }));
      await updatePbxMutation.mutateAsync(megaPbxPayload());
      toast.success("MegaPBX настройки сохранены");
      await loadSettings();
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

  const handleTestPbx = async () => {
    try {
      setState((prev) => ({
        ...prev,
        megaPbxTesting: true,
        megaPbxTestMessage: "",
      }));
      const result = await testPbxMutation.mutateAsync(megaPbxPayload());
      setState((prev) => ({
        ...prev,
        megaPbxTestMessage: result.success
          ? "Подключение к MegaPBX успешно"
          : result.error,
      }));
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось проверить подключение к MegaPBX";
      setState((prev) => ({ ...prev, megaPbxTestMessage: msg }));
    } finally {
      setState((prev) => ({ ...prev, megaPbxTesting: false }));
    }
  };

  const runPbxSync = async (type: "directory" | "calls" | "recordings") => {
    try {
      setState((prev) => ({ ...prev, megaPbxSyncing: type }));
      if (type === "directory") {
        await syncPbxDirectoryMutation.mutateAsync(undefined);
      } else if (type === "calls") {
        await syncPbxCallsMutation.mutateAsync(undefined);
      } else {
        await syncPbxRecordingsMutation.mutateAsync(undefined);
      }
      toast.success("Синхронизация MegaPBX завершена");
      await loadSettings();
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
    await loadSettings();
  };

  const handleUnlinkPbxTarget = async (input: {
    targetType: "employee" | "number";
    targetExternalId: string;
  }) => {
    await unlinkPbxUserMutation.mutateAsync(input);
    await loadSettings();
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

  const updatePrompt =
    (key: string, field: "value" | "description") =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      setState((prev) => ({
        ...prev,
        prompts: {
          ...prev.prompts,
          [key]: {
            ...prev.prompts[key],
            [field]: e.target.value,
          },
        },
      }));
    };

  const setPromptValue = (key: string, value: string) => {
    setState((prev) => ({
      ...prev,
      prompts: {
        ...prev.prompts,
        [key]: {
          ...prev.prompts[key],
          key,
          value,
        },
      },
    }));
  };

  const setFtpEnabled = (enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      prompts: {
        ...prev.prompts,
        ftp_enabled: {
          ...prev.prompts.ftp_enabled,
          key: "ftp_enabled",
          value: enabled ? "true" : "false",
        },
      },
    }));
  };

  const setTogglePrompt = (key: string, checked: boolean) => {
    setPromptValue(key, checked ? "true" : "false");
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
    handleTestPbx,
    handleSyncPbxDirectory: () => runPbxSync("directory"),
    handleSyncPbxCalls: () => runPbxSync("calls"),
    handleSyncPbxRecordings: () => runPbxSync("recordings"),
    handleLinkPbxTarget,
    handleUnlinkPbxTarget,
    handleSaveMegaPbx: handleSavePbx,
    handleTestMegaPbx: handleTestPbx,
    handleSyncMegaPbxDirectory: () => runPbxSync("directory"),
    handleSyncMegaPbxCalls: () => runPbxSync("calls"),
    handleSyncMegaPbxRecordings: () => runPbxSync("recordings"),
    handleLinkMegaPbxTarget: handleLinkPbxTarget,
    handleUnlinkMegaPbxTarget: handleUnlinkPbxTarget,
    handleBackup,
    handleSendTest,
    updatePrompt,
    setPromptValue,
    setFtpEnabled,
    setTogglePrompt,
  };
}
