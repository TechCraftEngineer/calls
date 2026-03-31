"use client";

import { useEffect } from "react";
import { SettingsPageShell, useSettings } from "@/components/features/settings";
import { FtpSection, IntegrationsSection } from "@/components/features/settings/integrations";

export default function SettingsIntegrationsPage() {
  const {
    state,
    loadSettings,
    handleSaveTelegram,
    handleSaveMaxBot,
    handleSaveFtp,
    handleTestFtp,
    setTelegramBotToken,
    setMaxBotToken,
    setFtpField,
    setFtpSyncFromDate,
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
        <p className="mt-1 text-sm text-muted-foreground">FTP, Telegram-бот и MAX-бот</p>
      </header>

      <div className="space-y-8">
        <FtpSection
          settings={state.ftp}
          onFieldChange={setFtpField}
          onSyncFromDateChange={setFtpSyncFromDate}
          onEnabledChange={setFtpEnabled}
          onSave={handleSaveFtp}
          onTest={handleTestFtp}
          saving={state.ftpSaving}
          testing={state.ftpTesting}
          testMessage={state.ftpTestMessage}
          connectionStatus={state.ftpConnectionStatus}
          statusLoading={state.ftpStatusLoading}
        />

        <IntegrationsSection
          integrations={state.integrations}
          onTelegramTokenChange={setTelegramBotToken}
          onMaxBotTokenChange={setMaxBotToken}
          onSaveTelegram={handleSaveTelegram}
          onSaveMaxBot={handleSaveMaxBot}
          telegramSaving={state.telegramSaving}
          maxBotSaving={state.maxBotSaving}
        />
      </div>
    </SettingsPageShell>
  );
}
