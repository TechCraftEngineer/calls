"use client";

import { paths } from "@calls/config";
import { toast } from "@calls/ui";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import api from "@/lib/api";
import { getCurrentUser, type User } from "@/lib/auth";
import { INTEGRATION_KEYS, PROMPT_KEYS } from "./constants";
import type { Prompt, SettingsState } from "./types";
import { validateFtpCredentials } from "./utils";

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

      const [promptsList, integrations] = await Promise.all([
        api.settings.getPrompts(),
        api.settings.getIntegrations(),
      ]);

      const promptsArr: Prompt[] = (
        Array.isArray(promptsList) ? promptsList : []
      ) as Prompt[];
      const promptsMap: Record<string, Prompt> = {};
      promptsArr.forEach((p: Prompt) => {
        promptsMap[p.key] = p;
      });

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
        description: "FTP host",
        updated_at: undefined,
      };
      promptsMap.ftp_user = {
        key: "ftp_user",
        value: ftp.user ?? "",
        description: "FTP user",
        updated_at: undefined,
      };
      promptsMap.ftp_password = {
        key: "ftp_password",
        value: ftp.password ?? "",
        description: "FTP password",
        updated_at: undefined,
      };
      promptsMap.telegram_bot_token = {
        key: "telegram_bot_token",
        value: integrations.telegram_bot_token ?? "",
        description: "Telegram Bot Token",
        updated_at: undefined,
      };
      promptsMap.max_bot_token = {
        key: "max_bot_token",
        value: integrations.max_bot_token ?? "",
        description: "MAX Bot Token",
        updated_at: undefined,
      };

      [...Object.keys(PROMPT_KEYS), ...Object.keys(INTEGRATION_KEYS)].forEach(
        (key) => {
          if (!promptsMap[key]) {
            promptsMap[key] = {
              key,
              value: "",
              description: "",
              updated_at: undefined,
            };
          }
        },
      );

      setState((prev) => ({ ...prev, prompts: promptsMap }));
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

  const handleSave = async () => {
    try {
      setState((prev) => ({ ...prev, saving: true }));

      const updates: Record<string, unknown> = {
        prompts: {} as Record<string, { value: string; description: string }>,
      };

      // Промпты — только PROMPT_KEYS
      Object.keys(PROMPT_KEYS).forEach((key) => {
        const prompt = state.prompts[key];
        if (prompt) {
          (
            updates.prompts as Record<
              string,
              { value: string; description: string }
            >
          )[key] = {
            value: prompt.value || "",
            description: prompt.description || "",
          };
        }
      });

      await Promise.all([
        api.settings.updatePrompts(updates),
        api.settings.updateIntegrations({
          telegram_bot_token: state.prompts.telegram_bot_token?.value ?? null,
          max_bot_token: state.prompts.max_bot_token?.value ?? null,
        }),
      ]);
      toast.success("Настройки сохранены");
      await loadSettings();
    } catch (error: unknown) {
      console.error("Failed to save settings:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить настройки";
      toast.error(msg);
    } finally {
      setState((prev) => ({ ...prev, saving: false }));
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
        const ftpValidation = validateFtpCredentials(host, user, password);
        if (!ftpValidation.isValid) {
          toast.error(ftpValidation.errors.join(". "));
          return;
        }
      }

      await api.settings.updateFtp({
        enabled,
        host,
        user,
        password,
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
        }));
      } else {
        setState((prev) => ({
          ...prev,
          ftpTestMessage: result.message,
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
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    handleSave,
    handleSaveFtp,
    handleTestFtp,
    handleBackup,
    handleSendTest,
    updatePrompt,
    setFtpEnabled,
  };
}
