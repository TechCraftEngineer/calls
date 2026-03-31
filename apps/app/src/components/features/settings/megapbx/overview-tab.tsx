"use client";

import type { MegaPbxSettings } from "../types";
import { AccessSection, QuickActionsSection, SyncOptionsSection, WebhookSection } from "./overview";
import type { AccessFormData, SyncOptionsFormData, WebhookFormData } from "./schemas";

export interface OverviewTabProps {
  megaPbx: MegaPbxSettings;
  baseUrl: string;
  apiKeySet: boolean;
  hasConnection: boolean;
  configuredFeatures: string[];
  testMessage: string;
  webhookUrl: string;
  savingAccess: boolean;
  savingSyncOptions: boolean;
  savingWebhook: boolean;
  testing: boolean;
  syncing: "directory" | "calls" | null;
  onSaveAccess: (data: AccessFormData) => Promise<void>;
  onSaveSyncOptions: (data: SyncOptionsFormData) => Promise<void>;
  onSaveWebhook: (data: WebhookFormData) => Promise<void>;
  onTest: (baseUrl?: string, apiKey?: string) => Promise<void>;
  onSyncDirectory: () => Promise<void>;
  onSyncCalls: () => Promise<void>;
}

export function OverviewTab({
  megaPbx,
  baseUrl,
  testMessage,
  webhookUrl,
  savingAccess,
  savingSyncOptions,
  savingWebhook,
  testing,
  syncing,
  onSaveAccess,
  onSaveSyncOptions,
  onSaveWebhook,
  onTest,
  onSyncDirectory,
  onSyncCalls,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <AccessSection
        baseUrl={baseUrl}
        apiKeyPasswordSet={megaPbx.apiKeySet}
        syncFromDate={megaPbx.syncFromDate}
        saving={savingAccess}
        testing={testing}
        testMessage={testMessage}
        onTest={onTest}
        onSaveAccess={onSaveAccess}
      />

      <SyncOptionsSection
        megaPbx={megaPbx}
        saving={savingSyncOptions}
        onSaveSyncOptions={onSaveSyncOptions}
      />

      <WebhookSection
        webhookSecret={megaPbx.webhookSecret}
        webhookSecretPasswordSet={megaPbx.webhookSecretSet}
        webhookUrl={webhookUrl}
        saving={savingWebhook}
        onSaveWebhook={onSaveWebhook}
      />

      <QuickActionsSection
        syncing={syncing}
        onSyncDirectory={onSyncDirectory}
        onSyncCalls={onSyncCalls}
      />
    </div>
  );
}
