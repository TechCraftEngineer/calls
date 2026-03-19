"use client";

import type { Prompt } from "../types";
import {
  AccessSection,
  QuickActionsSection,
  SyncOptionsSection,
  WebhookSection,
} from "./overview";
import type {
  AccessFormData,
  SyncOptionsFormData,
  WebhookFormData,
} from "./schemas";

export interface OverviewTabProps {
  prompts: Record<string, Prompt>;
  baseUrl: string;
  apiKeySet: boolean;
  hasConnection: boolean;
  configuredFeatures: string[];
  testMessage: string;
  webhookUrl: string;
  saving: boolean;
  testing: boolean;
  syncing: "directory" | "calls" | "recordings" | null;
  onPromptChange: (
    key: string,
    field: "value" | "description",
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onPromptValueChange: (key: string, value: string) => void;
  onToggleChange: (key: string, checked: boolean) => void;
  onSaveAccess: (data: AccessFormData) => Promise<void>;
  onSaveSyncOptions: (data: SyncOptionsFormData) => Promise<void>;
  onSaveWebhook: (data: WebhookFormData) => Promise<void>;
  onTest: (baseUrl?: string, apiKey?: string) => Promise<void>;
  onSyncDirectory: () => Promise<void>;
  onSyncCalls: () => Promise<void>;
  onSyncRecordings: () => Promise<void>;
}

export function OverviewTab({
  prompts,
  baseUrl,
  testMessage,
  webhookUrl,
  saving,
  testing,
  syncing,
  onPromptChange,
  onPromptValueChange,
  onToggleChange,
  onSaveAccess,
  onSaveSyncOptions,
  onSaveWebhook,
  onTest,
  onSyncDirectory,
  onSyncCalls,
  onSyncRecordings,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      <AccessSection
        baseUrl={baseUrl}
        apiKeyValue={prompts.megapbx_api_key?.value ?? ""}
        apiKeyPasswordSet={Boolean(prompts.megapbx_api_key?.meta?.passwordSet)}
        syncFromDate={prompts.megapbx_sync_from_date?.value ?? ""}
        saving={saving}
        testing={testing}
        testMessage={testMessage}
        onTest={onTest}
        onSaveAccess={onSaveAccess}
      />

      <SyncOptionsSection
        prompts={prompts}
        saving={saving}
        onSaveSyncOptions={onSaveSyncOptions}
      />

      <WebhookSection
        webhookSecret={prompts.megapbx_webhook_secret?.value ?? ""}
        webhookSecretPasswordSet={Boolean(
          prompts.megapbx_webhook_secret?.meta?.passwordSet,
        )}
        webhookUrl={webhookUrl}
        saving={saving}
        onSaveWebhook={onSaveWebhook}
      />

      <QuickActionsSection
        syncing={syncing}
        onSyncDirectory={onSyncDirectory}
        onSyncCalls={onSyncCalls}
        onSyncRecordings={onSyncRecordings}
      />
    </div>
  );
}
