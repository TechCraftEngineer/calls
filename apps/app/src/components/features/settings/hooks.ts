"use client";

import { paths } from "@calls/config";
import { validateTelegramBotToken } from "@calls/shared";
import { toast } from "@calls/ui";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import api from "@/lib/api";
import { getCurrentUser, type User } from "@/lib/auth";
import { INTEGRATION_KEYS } from "./constants";
import type { Prompt, SettingsState } from "./types";
import {
  validateFtpCredentials,
  validateFtpHost,
  validateFtpUser,
} from "./utils";

export function useSettings() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [state, setState] = useState<SettingsState>({
    prompts: {},
    loading: true,
    saving: false,
    backupLoading: false,
    sendTestLoading: false,
    sendTestMessage: "",
    ftpSaving: false,
    ftpTesting: false,
    ftpTestMessage: "",
    ftpConnectionStatus: null,
    ftpStatusLoading: false,
    telegramSaving: false,
    maxBotSaving: false,
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

      const integrations = await api.settings.getIntegrations();
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
      }));

      if (ftpConfigured) {
        try {
          const status = await api.settings.checkFtpStatus();
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
  }, [router]);

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
      await api.settings.updateIntegrations({
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
      await api.settings.updateIntegrations({
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
      await api.settings.updateFtp({
        enabled,
        host,
        user,
        password,
        syncFromDate:
          syncFromDate && /^\d{4}-\d{2}-\d{2}$/.test(syncFromDate)
            ? syncFromDate
            : undefined,
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

      const result = await api.settings.testFtp({
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

  const handleBackup = async () => {
    if (state.backupLoading) return;
    try {
      setState((prev) => ({ ...prev, backupLoading: true }));
      const res = await api.settings.backup();
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

  const handleSendTest = async () => {
    setState((prev) => ({
      ...prev,
      sendTestMessage: "",
      sendTestLoading: true,
    }));
    try {
      await api.reports.sendTestTelegram();
      setState((prev) => ({
        ...prev,
        sendTestMessage: "Тестовый отчёт отправлен в Telegram",
      }));
      setTimeout(() => {
        setState((prev) => ({ ...prev, sendTestMessage: "" }));
      }, 4000);
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { detail?: string } };
      };
      const d = e.response?.data?.detail;
      setState((prev) => ({
        ...prev,
        sendTestMessage:
          typeof d === "string"
            ? d
            : "Не удалось отправить. Укажите Telegram Chat ID в настройках отчётов.",
      }));
    } finally {
      setState((prev) => ({ ...prev, sendTestLoading: false }));
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

  return {
    currentUser,
    state,
    loadSettings,
    handleSaveTelegram,
    handleSaveMaxBot,
    handleSaveFtp,
    handleTestFtp,
    handleBackup,
    handleSendTest,
    updatePrompt,
    setPromptValue,
    setFtpEnabled,
  };
}
