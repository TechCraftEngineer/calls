"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@calls/ui";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PbxProviderLogo } from "@/components/features/settings";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { STORAGE_KEYS } from "../megapbx/constants";
import { EmployeesTab } from "../megapbx/employees-tab";
import { NumbersTab } from "../megapbx/numbers-tab";
import { OverviewTab } from "../megapbx/overview-tab";
import { SummaryTile } from "../megapbx/summary-tile";
import type { PbxSectionProps } from "../types";

function getWebhookBaseUrl(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/?$/, "") || window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/?$/, "") ?? "";
}

type ExtendedPbxSectionProps = PbxSectionProps & {
  activeTab?: string;
};

export default function MegaPbxSection({
  activeTab: activeTabProp = "overview",
  megaPbx,
  onEnabledChange,
  onSaveAccess,
  onSaveSyncOptions,
  onSaveExcludedNumbers,
  onSaveWebhook,
  onTest,
  onSyncDirectory,
  onSyncCalls,
  saving,
  savingAccess,
  savingSyncOptions,
  savingExcludedNumbers,
  savingWebhook,
  testing,
  syncing,
  testMessage,
  employeesLoading,
  numbersLoading,
  employees,
  numbers,
}: ExtendedPbxSectionProps) {
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [numberSearch, setNumberSearch] = useState("");

  const webhookUrl =
    activeWorkspace?.id && getWebhookBaseUrl()
      ? `${getWebhookBaseUrl()}/api/megapbx-webhook/${activeWorkspace.id}`
      : "";

  const enabled = megaPbx.enabled;
  const baseUrl = megaPbx.baseUrl;
  const apiKeySet = megaPbx.apiKeySet;
  const hasConnection = Boolean(baseUrl.trim()) && apiKeySet;
  const activeEmployees = employees.filter((item) => item.isActive).length;

  const excludedPhoneNumbers = useMemo(() => {
    const raw = megaPbx.excludePhoneNumbers;
    return raw
      .split(/[\n,;]+/)
      .map((value) => value.replace(/\D/g, ""))
      .filter(Boolean);
  }, [megaPbx.excludePhoneNumbers]);

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

  const handleTabChange = (value: string) => {
    const basePath = "/settings/pbx/megafon";
    if (value === "overview") {
      router.push(basePath);
    } else {
      router.push(`${basePath}/${value}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Компактная статистика */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="Статус"
          value={enabled ? "Включено" : "Выключено"}
          hint={enabled ? "Интеграция активна" : "Интеграция отключена"}
        />
        <SummaryTile
          label="Подключение"
          value={hasConnection ? "Настроено" : "Не настроено"}
          hint={hasConnection ? "Доступ к API настроен" : "Требуется настройка"}
        />
        <SummaryTile
          label="Сотрудники"
          value={String(employees.length)}
          hint={`Активных: ${activeEmployees}`}
        />
        <SummaryTile label="Номера" value={String(numbers.length)} hint="Всего номеров" />
      </div>

      {/* Переключатель интеграции */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PbxProviderLogo providerId="megafon" />
              <div>
                <CardTitle className="text-base">Интеграция</CardTitle>
                <CardDescription className="text-xs">
                  Включите для синхронизации данных
                </CardDescription>
              </div>
            </div>
            <label
              htmlFor="megapbx-enabled"
              className="flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 transition-colors hover:bg-accent has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring"
            >
              <Checkbox
                id="megapbx-enabled"
                checked={enabled}
                disabled={saving}
                onCheckedChange={(checked) => onEnabledChange(checked === true)}
              />
              <span className="text-sm font-medium">{enabled ? "Включено" : "Выключено"}</span>
            </label>
          </div>
        </CardHeader>
      </Card>

      {/* Табы */}
      <Card>
        <CardHeader className="pb-3">
          <Tabs value={activeTabProp} onValueChange={handleTabChange}>
            <TabsList variant="line" className="grid h-9 w-full grid-cols-3">
              <TabsTrigger value="overview" variant="line" className="text-sm">
                Настройки
              </TabsTrigger>
              <TabsTrigger value="employees" variant="line" className="text-sm">
                Сотрудники
              </TabsTrigger>
              <TabsTrigger value="numbers" variant="line" className="text-sm">
                Номера
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <Separator />

        <CardContent className="pt-4">
          {activeTabProp === "overview" && (
            <OverviewTab
              megaPbx={megaPbx}
              baseUrl={baseUrl}
              apiKeySet={apiKeySet}
              hasConnection={hasConnection}
              configuredFeatures={[]}
              testMessage={testMessage}
              webhookUrl={webhookUrl}
              savingAccess={savingAccess}
              savingSyncOptions={savingSyncOptions}
              savingWebhook={savingWebhook}
              testing={testing}
              syncing={syncing}
              onSaveAccess={onSaveAccess}
              onSaveSyncOptions={onSaveSyncOptions}
              onSaveWebhook={onSaveWebhook}
              onTest={onTest}
              onSyncDirectory={onSyncDirectory}
              onSyncCalls={onSyncCalls}
            />
          )}

          {activeTabProp === "employees" && (
            <EmployeesTab
              employees={employees}
              employeesLoading={employeesLoading}
              employeeSearch={employeeSearch}
              onEmployeeSearchChange={setEmployeeSearch}
            />
          )}

          {activeTabProp === "numbers" && (
            <NumbersTab
              numbers={numbers}
              numbersLoading={numbersLoading}
              numberSearch={numberSearch}
              onNumberSearchChange={setNumberSearch}
              excludedPhoneNumbers={excludedPhoneNumbers}
              savingExcludedNumbers={savingExcludedNumbers}
              onSaveExcludedNumbers={onSaveExcludedNumbers}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
