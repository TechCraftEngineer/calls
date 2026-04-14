"use client";

import { Button, Card, Input, PasswordInput } from "@calls/ui";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { useRef } from "react";
import { API_KEY_PLACEHOLDER } from "@/app/(app)/setup/pbx-setup/_components/constants";

interface ApiConfigCardProps {
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
  testAndSaveMutationPending: boolean;
  onTestAndSave: () => void;
}

export function ApiConfigCard({
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
  testAndSaveMutationPending,
  onTestAndSave,
}: ApiConfigCardProps) {
  const baseUrlInputRef = useRef<HTMLInputElement>(null);
  const apiKeyInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="mb-6 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <RefreshCw className="size-5 text-primary" />
        Настройки API
      </h2>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Base URL</label>
          <Input
            ref={baseUrlInputRef}
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value);
              if (baseUrlError) setBaseUrlError(null);
            }}
            placeholder="https://...megapbx.ru/crmapi/v1"
            disabled={configSaved}
            aria-invalid={baseUrlError ? "true" : "false"}
          />
          {baseUrlError && <p className="mt-1 text-sm text-destructive">{baseUrlError}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">API Key</label>
          <PasswordInput
            ref={apiKeyInputRef}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              if (apiKeyError) setApiKeyError(null);
            }}
            placeholder="Ключ авторизации"
            disabled={configSaved}
            aria-invalid={apiKeyError ? "true" : "false"}
          />
          {apiKeyError && <p className="mt-1 text-sm text-destructive">{apiKeyError}</p>}
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={onTestAndSave}
            disabled={testAndSaveMutationPending || configSaved}
            className="flex-1"
          >
            {testAndSaveMutationPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : configSaved ? (
              <Check className="mr-2 size-4" />
            ) : null}
            {configSaved ? "Подключено" : "Проверить и сохранить"}
          </Button>

          {configSaved && (
            <Button
              variant="outline"
              onClick={() => {
                setConfigSaved(false);
                // Очищаем placeholder API ключа при редактировании
                if (apiKey === API_KEY_PLACEHOLDER) {
                  setApiKey("");
                }
              }}
            >
              Изменить
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
