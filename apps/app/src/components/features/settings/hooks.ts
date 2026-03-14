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
    megafonFtpSaving: false,
    megafonFtpTesting: false,
    megafonFtpTestMessage: "",
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

      const promptsList = await api.settings.getPrompts();

      const promptsArr: Prompt[] = (
        Array.isArray(promptsList) ? promptsList : []
      ) as Prompt[];
      const promptsMap: Record<string, Prompt> = {};
      promptsArr.forEach((p: Prompt) => {
        promptsMap[p.key] = p;
      });
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

      // Добавляем промпты и интеграции, кроме Megafon FTP (у него своя кнопка)
      const keysWithoutMegafon = [
        ...Object.keys(PROMPT_KEYS),
        "telegram_bot_token",
        "max_bot_token",
      ];
      keysWithoutMegafon.forEach((key) => {
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

      await api.settings.updatePrompts(updates);
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

  const handleSaveMegafonFtp = async () => {
    try {
      setState((prev) => ({ ...prev, megafonFtpSaving: true }));
      const host = state.prompts.megafon_ftp_host?.value ?? "";
      const user = state.prompts.megafon_ftp_user?.value ?? "";
      const password = state.prompts.megafon_ftp_password?.value ?? "";

      const ftpValidation = validateFtpCredentials(host, user, password);
      if (!ftpValidation.isValid) {
        toast.error(ftpValidation.errors.join(". "));
        return;
      }

      await api.settings.updatePrompts({
        megafon_ftp_host: host,
        megafon_ftp_user: user,
        megafon_ftp_password: password,
      });
      toast.success("Параметры подключения Megafon FTP сохранены");
      await loadSettings();
    } catch (error: unknown) {
      console.error("Failed to save Megafon FTP:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить параметры FTP";
      toast.error(msg);
    } finally {
      setState((prev) => ({ ...prev, megafonFtpSaving: false }));
    }
  };

  const handleTestMegafonFtp = async () => {
    try {
      setState((prev) => ({
        ...prev,
        megafonFtpTestMessage: "",
        megafonFtpTesting: true,
      }));
      const host = state.prompts.megafon_ftp_host?.value ?? "";
      const user = state.prompts.megafon_ftp_user?.value ?? "";
      const password = state.prompts.megafon_ftp_password?.value ?? "";

      const ftpValidation = validateFtpCredentials(host, user, password);
      if (!ftpValidation.isValid) {
        setState((prev) => ({
          ...prev,
          megafonFtpTestMessage: ftpValidation.errors.join(". "),
        }));
        return;
      }

      const result = await api.settings.testMegafonFtp({
        host,
        user,
        password,
      });

      if (result.success) {
        setState((prev) => ({
          ...prev,
          megafonFtpTestMessage:
            "Подключение установлено. Учётные данные корректны.",
        }));
      } else {
        setState((prev) => ({
          ...prev,
          megafonFtpTestMessage: result.message,
        }));
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось проверить подключение";
      setState((prev) => ({
        ...prev,
        megafonFtpTestMessage: msg,
      }));
    } finally {
      setState((prev) => ({ ...prev, megafonFtpTesting: false }));
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

  return {
    currentUser,
    state,
    loadSettings,
    handleSave,
    handleSaveMegafonFtp,
    handleTestMegafonFtp,
    handleBackup,
    handleSendTest,
    updatePrompt,
  };
}
