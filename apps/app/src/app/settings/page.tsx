"use client";

import { useEffect } from "react";
import { useSettings } from "@/components/features/settings/hooks";
import SettingsPageShell from "@/components/features/settings/settings-page-shell";
import TelegramSection from "@/components/features/settings/telegram-section";

export default function SettingsGeneralPage() {
  const { state, loadSettings, handleSendTest } = useSettings();

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
        <h1 className="text-2xl font-semibold tracking-tight">
          Общие настройки
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Отчёты в Telegram и уведомления
        </p>
      </header>

      <TelegramSection
        sendTestLoading={state.sendTestLoading}
        sendTestReportType={state.sendTestReportType}
        sendTestMessage={state.sendTestMessage}
        onSendTest={handleSendTest}
      />
    </SettingsPageShell>
  );
}
