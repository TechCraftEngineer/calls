"use client";

import { paths } from "@calls/config";
import { Badge, Button } from "@calls/ui";
import Link from "next/link";
import { useEffect } from "react";
import { useSettings } from "@/components/features/settings/hooks";
import PbxSection from "@/components/features/settings/pbx/megapbx-section";
import { PbxProviderLogo } from "@/components/features/settings/pbx-provider-logo";
import SettingsPageShell from "@/components/features/settings/settings-page-shell";

export default function SettingsPbxMegafonPage() {
  const {
    state,
    loadSettings,
    handleSavePbxAccess,
    handleSavePbxSyncOptions,
    handleSavePbxExcludedNumbers,
    handleSavePbxWebhook,
    handleTestPbx,
    handleSyncPbxDirectory,
    handleSyncPbxCalls,
    handleLinkPbxTarget,
    handleUnlinkPbxTarget,
    setMegaPbxEnabled,
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

  const isEnabled = state.megaPbx.enabled;
  const baseUrl = state.megaPbx.baseUrl.trim();
  const apiKeySet = state.megaPbx.apiKeySet;

  return (
    <SettingsPageShell>
      <header className="mb-8 flex flex-col gap-4">
        <nav
          className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          aria-label="Хлебные крошки"
        >
          <Link
            href={paths.settings.pbx}
            className="transition-colors hover:text-foreground"
          >
            АТС
          </Link>
          <span aria-hidden>/</span>
          <span aria-current="page" className="font-medium text-foreground">
            Мегафон
          </span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <PbxProviderLogo providerId="megafon" />
                <Badge variant="secondary">Мегафон</Badge>
              </div>
              <Badge variant={isEnabled ? "default" : "outline"}>
                {isEnabled ? "Интеграция включена" : "Интеграция выключена"}
              </Badge>
              <Badge variant={baseUrl && apiKeySet ? "secondary" : "outline"}>
                {baseUrl && apiKeySet
                  ? "Подключение готово"
                  : "Нужно заполнить"}
              </Badge>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Настройки АТС Мегафон
            </h1>
            <p className="text-sm text-muted-foreground">
              Подключение, синхронизация и привязка данных Мегафона
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={paths.settings.pbx}>К списку АТС</Link>
          </Button>
        </div>
      </header>

      <PbxSection
        megaPbx={state.megaPbx}
        onEnabledChange={setMegaPbxEnabled}
        onSaveAccess={handleSavePbxAccess}
        onSaveSyncOptions={handleSavePbxSyncOptions}
        onSaveExcludedNumbers={handleSavePbxExcludedNumbers}
        onSaveWebhook={handleSavePbxWebhook}
        onTest={handleTestPbx}
        onSyncDirectory={handleSyncPbxDirectory}
        onSyncCalls={handleSyncPbxCalls}
        onLink={handleLinkPbxTarget}
        onUnlink={handleUnlinkPbxTarget}
        saving={
          state.megaPbxAccessSaving ||
          state.megaPbxSyncOptionsSaving ||
          state.megaPbxWebhookSaving
        }
        savingAccess={state.megaPbxAccessSaving}
        savingSyncOptions={state.megaPbxSyncOptionsSaving}
        savingExcludedNumbers={state.megaPbxExcludedNumbersSaving}
        savingWebhook={state.megaPbxWebhookSaving}
        testing={state.megaPbxTesting}
        syncing={state.megaPbxSyncing}
        testMessage={state.megaPbxTestMessage}
        employeesLoading={state.megaPbxEmployeesLoading}
        numbersLoading={state.megaPbxNumbersLoading}
        employees={state.megaPbxEmployees}
        numbers={state.megaPbxNumbers}
      />
    </SettingsPageShell>
  );
}
