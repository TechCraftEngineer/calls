"use client";

import { paths } from "@calls/config";
import { toast } from "@calls/ui";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useApiConfig } from "./use-api-config";
import { usePbxMutations } from "./use-pbx-mutations";
import { useWebhookConfig } from "./use-webhook-config";

export type { UsePbxSetupReturn } from "./types";

export function usePbxSetup() {
  const router = useRouter();

  // Webhook config
  const { webhookUrl, webhookSecret, webhookSecretLoading } = useWebhookConfig();

  // API config form
  const {
    baseUrl,
    setBaseUrl,
    apiKey,
    setApiKey,
    baseUrlError,
    setBaseUrlError,
    apiKeyError,
    setApiKeyError,
    configSaved,
    setConfigSaved,
    baseUrlInputRef,
    apiKeyInputRef,
    validateConfig,
    focusFirstError,
  } = useApiConfig();

  // Mutations
  const {
    testAndSaveMutationPending,
    syncMutationPending,
    handleTestAndSave: baseHandleTestAndSave,
    handleSync: baseHandleSync,
  } = usePbxMutations(validateConfig, focusFirstError, () => {});

  // Handlers with dependencies
  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован в буфер обмена`);
  }, []);

  const handleTestAndSave = useCallback(() => {
    baseHandleTestAndSave(baseUrl, apiKey, webhookSecret);
    setConfigSaved(true);
  }, [baseHandleTestAndSave, baseUrl, apiKey, webhookSecret, setConfigSaved]);

  const handleSync = useCallback(() => {
    baseHandleSync();
    // После синхронизации перенаправляем на страницу directory
    // Небольшая задержка чтобы пользователь увидел сообщение о синхронизации
    setTimeout(() => {
      router.push(paths.setup.directory);
    }, 1500);
  }, [baseHandleSync, router]);

  return {
    // Webhook
    webhookUrl,
    webhookSecret,
    webhookSecretLoading,

    // API Config
    baseUrl,
    setBaseUrl,
    apiKey,
    setApiKey,
    baseUrlError,
    setBaseUrlError,
    apiKeyError,
    setApiKeyError,
    configSaved,
    setConfigSaved,
    baseUrlInputRef,
    apiKeyInputRef,

    // Mutations status
    testAndSaveMutationPending,
    syncMutationPending,

    // Handlers
    handleCopy,
    handleTestAndSave,
    handleSync,
  };
}
