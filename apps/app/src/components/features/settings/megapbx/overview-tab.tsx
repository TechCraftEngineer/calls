"use client";

import { Card, CardContent } from "@calls/ui";
import { useCallback } from "react";
import type { Prompt } from "../types";
import {
  AccessSection,
  QuickActionsSection,
  SyncOptionsSection,
  WebhookSection,
} from "./overview";

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
  onSaveAccess: () => Promise<void>;
  onSaveSyncOptions: () => Promise<void>;
  onSaveWebhook: () => Promise<void>;
  onTest: () => Promise<void>;
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
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
  }, []);

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <AccessSection
        prompts={prompts}
        baseUrl={baseUrl}
        saving={saving}
        testing={testing}
        onPromptChange={onPromptChange}
        onPromptValueChange={onPromptValueChange}
        onTest={onTest}
        onSaveAccess={onSaveAccess}
      />

      <SyncOptionsSection
        prompts={prompts}
        saving={saving}
        onToggleChange={onToggleChange}
        onSaveSyncOptions={onSaveSyncOptions}
      />

      <WebhookSection
        prompts={prompts}
        webhookUrl={webhookUrl}
        saving={saving}
        onPromptChange={onPromptChange}
        onPromptValueChange={onPromptValueChange}
        onSaveWebhook={onSaveWebhook}
      />

      {testMessage && (
        <Card className="rounded-lg border-border/60">
          <CardContent className="px-4 py-3 text-sm">{testMessage}</CardContent>
        </Card>
      )}

      <QuickActionsSection
        syncing={syncing}
        onSyncDirectory={onSyncDirectory}
        onSyncCalls={onSyncCalls}
        onSyncRecordings={onSyncRecordings}
      />
    </form>
  );
}
