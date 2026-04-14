"use client";

import Header from "@/components/layout/header";
import { ApiConfigCard, SyncCard, usePbxSetup, WebhookConfigCard } from "./_components";

export default function PbxSetupPage() {
  const {
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

    // Mutations
    testAndSaveMutationPending,
    syncMutationPending,

    // Handlers
    handleCopy,
    handleTestAndSave,
    handleSync,
  } = usePbxSetup();

  return (
    <>
      <Header user={null} />

      <main className="main-content">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Подключение API телефонии</h1>
            <p className="text-muted-foreground">
              Настройте интеграцию с вашей телефонной системой
            </p>
          </div>

          <WebhookConfigCard
            webhookUrl={webhookUrl}
            webhookSecret={webhookSecret}
            webhookSecretLoading={webhookSecretLoading}
            onCopy={handleCopy}
          />

          <ApiConfigCard
            baseUrl={baseUrl}
            setBaseUrl={setBaseUrl}
            apiKey={apiKey}
            setApiKey={setApiKey}
            baseUrlError={baseUrlError}
            setBaseUrlError={setBaseUrlError}
            apiKeyError={apiKeyError}
            setApiKeyError={setApiKeyError}
            configSaved={configSaved}
            setConfigSaved={setConfigSaved}
            testAndSaveMutationPending={testAndSaveMutationPending}
            onTestAndSave={handleTestAndSave}
          />

          {configSaved && (
            <SyncCard syncMutationPending={syncMutationPending} onSync={handleSync} />
          )}
        </div>
      </main>
    </>
  );
}
