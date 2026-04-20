"use client";

import { paths } from "@calls/config";
import { Badge, Button, Checkbox, Tabs, TabsList, TabsTrigger } from "@calls/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { PbxProviderLogo, SettingsPageShell, useSettings } from "@/components/features/settings";
import { STORAGE_KEYS } from "@/components/features/settings/megapbx/constants";
import { EmployeesTab } from "@/components/features/settings/megapbx/employees-tab";
import { NumbersTab } from "@/components/features/settings/megapbx/numbers-tab";
import { OverviewTab } from "@/components/features/settings/megapbx/overview-tab";
import { SummaryTile } from "@/components/features/settings/megapbx/summary-tile";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";

function getWebhookBaseUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/?$/, "") || window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/?$/, "") ?? "";
}

type PageProps = {
  params: Promise<{ tab?: string[] }>;
};

export default function SettingsPbxMegafonPage({ params }: PageProps) {
  const router = useRouter();
  const { activeWorkspace, loading: workspaceLoading } = useWorkspace();
  const isWorkspaceAdmin = activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";

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
    setMegaPbxEnabled,
  } = useSettings();

  const [resolvedParams, setResolvedParams] = React.useState<{ tab?: string[] } | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [numberSearch, setNumberSearch] = useState("");

  // Вычисляем значения до условных возвратов
  const isEnabled = state.megaPbx.enabled;
  const baseUrl = state.megaPbx.baseUrl.trim();
  const apiKeySet = state.megaPbx.apiKeySet;
  const activeTab = resolvedParams?.tab?.[0] || "overview";
  const hasConnection = Boolean(baseUrl) && apiKeySet;
  const activeEmployees = state.megaPbxEmployees.filter((item) => item.isActive).length;
  const saving =
    state.megaPbxAccessSaving || state.megaPbxSyncOptionsSaving || state.megaPbxWebhookSaving;

  const webhookUrl =
    activeWorkspace?.id && getWebhookBaseUrl()
      ? `${getWebhookBaseUrl()}/api/megapbx-webhook/${activeWorkspace.id}`
      : "";

  const excludedPhoneNumbers = useMemo(() => {
    const raw = state.megaPbx.excludePhoneNumbers;
    return raw
      .split(/[\n,;]+/)
      .map((value) => value.replace(/\D/g, ""))
      .filter(Boolean);
  }, [state.megaPbx.excludePhoneNumbers]);

  const handleTabChange = (value: string) => {
    const basePath = "/settings/pbx/megafon";
    if (value === "overview") {
      router.push(basePath);
    } else {
      router.push(`${basePath}/${value}`);
    }
  };

  React.useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedEmployeeSearch = window.localStorage.getItem(STORAGE_KEYS.employeeSearch);
    const savedNumberSearch = window.localStorage.getItem(STORAGE_KEYS.numberSearch);
    if (savedEmployeeSearch) setEmployeeSearch(savedEmployeeSearch);
    if (savedNumberSearch) setNumberSearch(savedNumberSearch);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.employeeSearch, employeeSearch);
    window.localStorage.setItem(STORAGE_KEYS.numberSearch, numberSearch);
  }, [employeeSearch, numberSearch]);

  useEffect(() => {
    if (workspaceLoading) return;
    if (!isWorkspaceAdmin) {
      router.replace(paths.forbidden);
      return;
    }
  }, [isWorkspaceAdmin, workspaceLoading, router]);

  useEffect(() => {
    if (!workspaceLoading && isWorkspaceAdmin) {
      loadSettings();
    }
  }, [isWorkspaceAdmin, workspaceLoading, loadSettings]);

  if (workspaceLoading || !isWorkspaceAdmin || !resolvedParams) {
    return (
      <SettingsPageShell>
        <div className="flex items-center justify-center py-24">
          <div className="text-muted-foreground">Загрузка…</div>
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
      <div className="space-y-6">
        {/* Компактный заголовок с переключателем */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <PbxProviderLogo providerId="megafon" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">Мегафон</h1>
                <Badge variant={isEnabled ? "default" : "secondary"} className="h-5 text-xs">
                  {isEnabled ? "Включено" : "Выключено"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Настройки интеграции АТС</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="megapbx-enabled"
              className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring"
            >
              <Checkbox
                id="megapbx-enabled"
                checked={isEnabled}
                disabled={saving}
                onCheckedChange={(checked) => setMegaPbxEnabled(checked === true)}
              />
              <span className="font-medium">Интеграция</span>
            </label>
            <Button asChild variant="ghost" size="sm">
              <Link href={paths.settings.pbx}>Назад</Link>
            </Button>
          </div>
        </div>

        {/* Статистика без карточек */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryTile
            label="Статус"
            value={isEnabled ? "Включено" : "Выключено"}
            hint={isEnabled ? "Интеграция активна" : "Интеграция отключена"}
          />
          <SummaryTile
            label="Подключение"
            value={hasConnection ? "Настроено" : "Не настроено"}
            hint={hasConnection ? "Доступ к API настроен" : "Требуется настройка"}
          />
          <SummaryTile
            label="Сотрудники"
            value={String(state.megaPbxEmployees.length)}
            hint={`Активных: ${activeEmployees}`}
          />
          <SummaryTile
            label="Номера"
            value={String(state.megaPbxNumbers.length)}
            hint="Всего номеров"
          />
        </div>

        {/* Табы с контентом */}
        <div>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList variant="line" className="mb-6">
              <TabsTrigger value="overview" variant="line">
                Настройки
              </TabsTrigger>
              <TabsTrigger value="employees" variant="line">
                Сотрудники
              </TabsTrigger>
              <TabsTrigger value="numbers" variant="line">
                Номера
              </TabsTrigger>
            </TabsList>

            <div className="space-y-6">
              {activeTab === "overview" && (
                <OverviewTab
                  megaPbx={state.megaPbx}
                  baseUrl={baseUrl}
                  apiKeySet={apiKeySet}
                  hasConnection={hasConnection}
                  configuredFeatures={[]}
                  testMessage={state.megaPbxTestMessage}
                  webhookUrl={webhookUrl}
                  savingAccess={state.megaPbxAccessSaving}
                  savingSyncOptions={state.megaPbxSyncOptionsSaving}
                  savingWebhook={state.megaPbxWebhookSaving}
                  testing={state.megaPbxTesting}
                  syncing={state.megaPbxSyncing}
                  onSaveAccess={handleSavePbxAccess}
                  onSaveSyncOptions={handleSavePbxSyncOptions}
                  onSaveWebhook={handleSavePbxWebhook}
                  onTest={handleTestPbx}
                  onSyncDirectory={handleSyncPbxDirectory}
                  onSyncCalls={handleSyncPbxCalls}
                />
              )}

              {activeTab === "employees" && (
                <EmployeesTab
                  employees={state.megaPbxEmployees}
                  employeesLoading={state.megaPbxEmployeesLoading}
                  employeeSearch={employeeSearch}
                  onEmployeeSearchChange={setEmployeeSearch}
                />
              )}

              {activeTab === "numbers" && (
                <NumbersTab
                  numbers={state.megaPbxNumbers}
                  numbersLoading={state.megaPbxNumbersLoading}
                  numberSearch={numberSearch}
                  onNumberSearchChange={setNumberSearch}
                  excludedPhoneNumbers={excludedPhoneNumbers}
                  savingExcludedNumbers={state.megaPbxExcludedNumbersSaving}
                  onSaveExcludedNumbers={handleSavePbxExcludedNumbers}
                />
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </SettingsPageShell>
  );
}
