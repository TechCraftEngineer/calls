"use client";

import { validateTelegramBotToken } from "@calls/shared";
import { toast } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useORPC } from "@/orpc/react";
import type { IntegrationsSettings, SettingsState } from "../types";

interface UseTelegramSettingsProps {
  state: {
    integrations: IntegrationsSettings;
    telegramSaving: boolean;
    maxBotSaving: boolean;
  };
  setState: React.Dispatch<React.SetStateAction<SettingsState>>;
}

export function useTelegramSettings({
  state,
  setState,
}: UseTelegramSettingsProps) {
  const orpc = useORPC();
  const queryClient = useQueryClient();

  const updateIntegrationsMutation = useMutation(
    orpc.settings.updateIntegrations.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getIntegrations.queryKey(),
        });
      },
    }),
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
      setState((prev: SettingsState) => ({ ...prev, telegramSaving: true }));
      await updateIntegrationsMutation.mutateAsync({
        telegram_bot_token: telegramToken || null,
      });
      toast.success(
        telegramToken
          ? "Telegram Bot компании сохранён"
          : "Включено использование системного Telegram-бота",
      );
    } catch (error: unknown) {
      console.error("Failed to save Telegram:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Не удалось сохранить настройки Telegram";
      toast.error(msg);
    } finally {
      setState((prev: SettingsState) => ({ ...prev, telegramSaving: false }));
    }
  };

  const handleSaveMaxBot = async () => {
    try {
      setState((prev: SettingsState) => ({ ...prev, maxBotSaving: true }));
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
      setState((prev: SettingsState) => ({ ...prev, maxBotSaving: false }));
    }
  };

  const setTelegramBotToken = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const value = e.target.value;
    setState((prev: SettingsState) => ({
      ...prev,
      integrations: { ...prev.integrations, telegramBotToken: value },
    }));
  };

  const setMaxBotToken = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const value = e.target.value;
    setState((prev: SettingsState) => ({
      ...prev,
      integrations: { ...prev.integrations, maxBotToken: value },
    }));
  };

  return {
    handleSaveTelegram,
    handleSaveMaxBot,
    setTelegramBotToken,
    setMaxBotToken,
  };
}
