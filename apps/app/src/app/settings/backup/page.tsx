"use client";

import { useEffect } from "react";
import {
  BackupSection,
  SettingsPageShell,
  useSettings,
} from "@/components/features/settings";

export default function SettingsBackupPage() {
  const { state, loadSettings, handleBackup } = useSettings();

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
          Резервная копия
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Экспорт базы данных на сервер
        </p>
      </header>

      <BackupSection
        backupLoading={state.backupLoading}
        onBackup={handleBackup}
      />
    </SettingsPageShell>
  );
}
