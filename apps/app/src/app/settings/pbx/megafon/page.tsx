"use client";

import { paths } from "@calls/config";
import { Badge, Button } from "@calls/ui";
import Link from "next/link";
import { useEffect } from "react";
import { useSettings } from "@/components/features/settings/hooks";
import PbxSection from "@/components/features/settings/pbx-section";
import SettingsPageShell from "@/components/features/settings/settings-page-shell";

export default function SettingsPbxMegafonPage() {
  const {
    state,
    loadSettings,
    handleSavePbx,
    handleTestPbx,
    handleSyncPbxDirectory,
    handleSyncPbxCalls,
    handleSyncPbxRecordings,
    handleLinkPbxTarget,
    handleUnlinkPbxTarget,
    updatePrompt,
    setTogglePrompt,
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

  const isEnabled = state.prompts.megapbx_enabled?.value === "true";
  const baseUrl = state.prompts.megapbx_base_url?.value?.trim() ?? "";
  const apiKeySet = Boolean(state.prompts.megapbx_api_key?.meta?.passwordSet);

  return (
    <SettingsPageShell>
      <header className="mb-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href={paths.settings.pbx} className="hover:text-foreground">
            АТС
          </Link>
          <span>/</span>
          <span className="text-foreground">Мегафон</span>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Мегафон</Badge>
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
            <p className="mt-1 text-sm text-muted-foreground">
              Подключение, синхронизация и привязка данных Мегафона
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={paths.settings.pbx}>К списку АТС</Link>
          </Button>
        </div>
      </header>

      <PbxSection
        prompts={state.prompts}
        onPromptChange={updatePrompt}
        onToggleChange={setTogglePrompt}
        onSave={handleSavePbx}
        onTest={handleTestPbx}
        onSyncDirectory={handleSyncPbxDirectory}
        onSyncCalls={handleSyncPbxCalls}
        onSyncRecordings={handleSyncPbxRecordings}
        onLink={handleLinkPbxTarget}
        onUnlink={handleUnlinkPbxTarget}
        saving={state.megaPbxSaving}
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
