"use client";

import { useCallback, useRef, useState } from "react";

export interface UseApiConfigReturn {
  baseUrl: string;
  setBaseUrl: (value: string) => void;
  apiKey: string;
  setApiKey: (value: string) => void;
  baseUrlError: string | null;
  setBaseUrlError: (value: string | null) => void;
  apiKeyError: string | null;
  setApiKeyError: (value: string | null) => void;
  configSaved: boolean;
  setConfigSaved: (value: boolean) => void;
  baseUrlInputRef: React.RefObject<HTMLInputElement | null>;
  apiKeyInputRef: React.RefObject<HTMLInputElement | null>;
  validateConfig: () => boolean;
  focusFirstError: () => void;
}

export function useApiConfig(): UseApiConfigReturn {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrlError, setBaseUrlError] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [configSaved, setConfigSaved] = useState(false);
  const baseUrlInputRef = useRef<HTMLInputElement>(null);
  const apiKeyInputRef = useRef<HTMLInputElement>(null);

  const validateConfig = useCallback(() => {
    const trimmedBaseUrl = baseUrl.trim();
    const trimmedApiKey = apiKey.trim();

    setBaseUrlError(null);
    setApiKeyError(null);

    let hasError = false;

    if (!trimmedBaseUrl) {
      setBaseUrlError("Введите Base URL");
      hasError = true;
    } else if (!trimmedBaseUrl.startsWith("http://") && !trimmedBaseUrl.startsWith("https://")) {
      setBaseUrlError("URL должен начинаться с http:// или https://");
      hasError = true;
    }

    if (!trimmedApiKey) {
      setApiKeyError("Введите API Key");
      hasError = true;
    }

    return !hasError;
  }, [baseUrl, apiKey]);

  const focusFirstError = useCallback(() => {
    const trimmedBaseUrl = baseUrl.trim();
    if (
      !trimmedBaseUrl ||
      (!trimmedBaseUrl.startsWith("http://") && !trimmedBaseUrl.startsWith("https://"))
    ) {
      baseUrlInputRef.current?.focus();
    } else {
      apiKeyInputRef.current?.focus();
    }
  }, [baseUrl]);

  return {
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
  };
}
