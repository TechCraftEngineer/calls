"use client";

import { paths } from "@calls/config";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import api from "@/lib/api";
import { getCurrentUser, type User } from "@/lib/auth";
import { INTEGRATION_KEYS, PROMPT_KEYS } from "../constants/prompts";
import type { Prompt, SettingsState } from "../types/settings";
import { validateFtpCredentials } from "../utils/prompt-updater";

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
        alert("Доступ запрещен.");
        router.push(paths.dashboard.root);
      }
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [router]);

  const handleSave = async () => {
    try {
      setState((prev) => ({ ...prev, saving: true }));

      // Валидация FTP credentials
      const ftpValidation = validateFtpCredentials(
        state.prompts.megafon_ftp_host?.value,
        state.prompts.megafon_ftp_user?.value,
        state.prompts.megafon_ftp_password?.value,
      );

      if (!ftpValidation.isValid) {
        alert(`Ошибка валидации FTP:\n${ftpValidation.errors.join("\n")}`);
        return;
      }

      const updates: Record<string, unknown> = {
        prompts: {} as Record<string, { value: string; description: string }>,
      };

      // Добавляем все промпты включая интеграционные
      [...Object.keys(PROMPT_KEYS), ...Object.keys(INTEGRATION_KEYS)].forEach(
        (key) => {
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
        },
      );

      await api.settings.updatePrompts(updates);
      alert("Настройки успешно сохранены");
      await loadSettings();
    } catch (error: unknown) {
      console.error("Failed to save settings:", error);
      alert("Ошибка при сохранении настроек");
    } finally {
      setState((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleBackup = async () => {
    if (state.backupLoading) return;
    try {
      setState((prev) => ({ ...prev, backupLoading: true }));
      const res = await api.settings.backup();
      const path = res?.path ?? "";
      alert(`Резервная копия создана.\n\nПуть на сервере: ${path}`);
    } catch (error: unknown) {
      const msg =
        (error instanceof Error ? error.message : String(error)) ||
        "Ошибка при создании копии";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
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
        sendTestMessage: "Отчёт успешно отправлен в Telegram",
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
            : "Не удалось отправить. Укажите Telegram Chat ID в Настройках отчётов.",
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
    handleBackup,
    handleSendTest,
    updatePrompt,
  };
}
