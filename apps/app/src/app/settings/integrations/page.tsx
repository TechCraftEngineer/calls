"use client";

import { useEffect } from "react";
import FtpSection from "@/components/features/settings/ftp-section";
import { useSettings } from "@/components/features/settings/hooks";
import IntegrationsSection from "@/components/features/settings/integrations-section";
import SettingsPageShell from "@/components/features/settings/settings-page-shell";

export default function SettingsIntegrationsPage() {
  const {
    state,
    loadSettings,
    handleSave,
    handleSaveFtp,
    handleTestFtp,
    updatePrompt,
    setFtpEnabled,
  } = useSettings();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (state.loading) {
    return (
      <SettingsPageShell>
        <div className="flex items-center justify-center py-24">
          <div className="text-muted-foreground">Загрузка…</div>
        </div>
      </SettingsPageShell>
    );
  }

  return (
    <SettingsPageShell>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Интеграции</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          FTP, Telegram Bot, MAX Bot
        </p>
      </header>

      <div className="space-y-8">
        <FtpSection
          prompts={state.prompts}
          onPromptChange={updatePrompt}
          onEnabledChange={setFtpEnabled}
          onSave={handleSaveFtp}
          onTest={handleTestFtp}
          saving={state.ftpSaving}
          testing={state.ftpTesting}
          testMessage={state.ftpTestMessage}
        />

        <IntegrationsSection
          prompts={state.prompts}
          onPromptChange={updatePrompt}
        />
      </div>

      <SettingsPageShell.Footer
        onSave={handleSave}
        onCancel={loadSettings}
        saving={state.saving}
      />
    </SettingsPageShell>
  );
}
