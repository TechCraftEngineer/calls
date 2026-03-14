"use client";

import { useEffect } from "react";
import { useSettings } from "@/components/features/settings/hooks";
import IntegrationsSection from "@/components/features/settings/integrations-section";
import MegafonFtpSection from "@/components/features/settings/megafon-ftp-section";
import SettingsPageShell from "@/components/features/settings/settings-page-shell";

export default function SettingsIntegrationsPage() {
  const {
    state,
    loadSettings,
    handleSave,
    handleSaveMegafonFtp,
    handleTestMegafonFtp,
    updatePrompt,
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
          Megafon FTP, Telegram Bot, MAX Bot
        </p>
      </header>

      <div className="space-y-8">
        <MegafonFtpSection
          prompts={state.prompts}
          onPromptChange={updatePrompt}
          onSave={handleSaveMegafonFtp}
          onTest={handleTestMegafonFtp}
          saving={state.megafonFtpSaving}
          testing={state.megafonFtpTesting}
          testMessage={state.megafonFtpTestMessage}
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
