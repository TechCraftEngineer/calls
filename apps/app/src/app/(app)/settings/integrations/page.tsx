"use client";

import { paths } from "@calls/config";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SettingsPageShell, useSettings } from "@/components/features/settings";
import { FtpSection, IntegrationsSection } from "@/components/features/settings/integrations";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";

export default function SettingsIntegrationsPage() {
  const router = useRouter();
  const { activeWorkspace, loading: workspaceLoading } = useWorkspace();
  const isWorkspaceAdmin = activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";

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
    // Ждём загрузки workspace перед проверкой прав
    if (workspaceLoading) return;

    if (activeWorkspace && !isWorkspaceAdmin) {
      router.replace(paths.forbidden);
      return;
    }
  }, [activeWorkspace, isWorkspaceAdmin, workspaceLoading, router]);

  useEffect(() => {
    if (!workspaceLoading && isWorkspaceAdmin) {
      loadSettings();
    }
  }, [isWorkspaceAdmin, workspaceLoading, loadSettings]);

  if (workspaceLoading || !isWorkspaceAdmin) {
    return (
      <SettingsPageShell>
        <div className="flex items-center justify-center py-24">
          <div className="text-muted-foreground">Загрузка…</div>
        </div>
      </SettingsPageShell>
    );
  }

  if (!activeWorkspace) {
    return (
      <SettingsPageShell>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Компания не найдена</h2>
            <p className="text-muted-foreground mb-4">Выберите компанию или создайте новую</p>
            <Link
              href={paths.dashboard.root}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              На главную
            </Link>
          </div>
        </div>
      </SettingsPageShell>
    );
  }

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
