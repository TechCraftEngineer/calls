"use client";

import { paths } from "@calls/config";
import { toast } from "@calls/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { useApiConfig } from "./use-api-config";
import { usePbxMutations } from "./use-pbx-mutations";
import { useWebhookConfig } from "./use-webhook-config";

export type { UsePbxSetupReturn } from "./types";

export function usePbxSetup() {
  const router = useRouter();
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

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
  const { testAndSaveMutationPending, handleTestAndSave: baseHandleTestAndSave } = usePbxMutations(
    validateConfig,
    focusFirstError,
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  // Handlers with dependencies
  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован в буфер обмена`);
  }, []);

  const handleTestAndSave = useCallback(() => {
    baseHandleTestAndSave(baseUrl, apiKey, webhookSecret, () => {
      setConfigSaved(true);
      // Небольшая задержка чтобы пользователь увидел сообщение об успехе
      timeoutIdRef.current = setTimeout(() => {
        router.push(paths.setup.directory);
      }, 1000);
    });
  }, [baseHandleTestAndSave, baseUrl, apiKey, webhookSecret, setConfigSaved, router]);

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

    // Handlers
    handleCopy,
    handleTestAndSave,
  };
}
