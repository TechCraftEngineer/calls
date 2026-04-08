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

export default function MegaPbxSection({
  megaPbx,
  onEnabledChange,
  onSaveAccess,
  onSaveSyncOptions,
  onSaveExcludedNumbers,
  onSaveWebhook,
  onTest,
  onSyncDirectory,
  onSyncCalls,
  onLink,
  onUnlink,
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
}: PbxSectionProps) {
  const { activeWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState("overview");
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
  const linkedEmployees = employees.filter((item) => Boolean(item.link)).length;
  const linkedNumbers = numbers.filter((item) => Boolean(item.link)).length;
  const activeEmployees = employees.filter((item) => item.isActive).length;
  const configuredFeatures = [
    megaPbx.syncEmployees ? "Сотрудники" : null,
    megaPbx.syncNumbers ? "Номера" : null,
    megaPbx.syncCalls ? "Звонки и записи" : null,
    megaPbx.webhooksEnabled ? "Вебхуки" : null,
  ].filter(Boolean) as string[];

  const employeeLinkOptions = useMemo(
    () =>
      Object.fromEntries(
        employees.map((employee) => [
          employee.externalId,
          [
            ...employee.candidates.map((candidate) => ({
              value: `user:${candidate.id}`,
              label: `${candidate.name || candidate.email} (${candidate.email})`,
            })),
            ...employee.invitationCandidates.map((candidate) => ({
              value: `invite:${candidate.id}`,
              label: `Инвайт: ${candidate.email}`,
            })),
          ],
        ]),
      ),
    [employees],
  );

  const numberLinkOptions = useMemo(
    () =>
      Object.fromEntries(
        numbers.map((number) => [
          number.externalId,
          [
            ...number.candidates.map((candidate) => ({
              value: `user:${candidate.id}`,
              label: `${candidate.name || candidate.email} (${candidate.email})`,
            })),
          ],
        ]),
      ),
    [numbers],
  );
  const excludedPhoneNumbers = useMemo(() => {
    const raw = megaPbx.excludePhoneNumbers;
    return raw
      .split(/[\n,;]+/)
      .map((value) => value.replace(/\D/g, ""))
      .filter(Boolean);
  }, [megaPbx.excludePhoneNumbers]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedTab = window.localStorage.getItem(STORAGE_KEYS.tab);
    const savedEmployeeSearch = window.localStorage.getItem(STORAGE_KEYS.employeeSearch);
    const savedNumberSearch = window.localStorage.getItem(STORAGE_KEYS.numberSearch);

    if (savedTab) setActiveTab(savedTab);
    if (savedEmployeeSearch) setEmployeeSearch(savedEmployeeSearch);
    if (savedNumberSearch) setNumberSearch(savedNumberSearch);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(STORAGE_KEYS.tab, activeTab);
    window.localStorage.setItem(STORAGE_KEYS.employeeSearch, employeeSearch);
    window.localStorage.setItem(STORAGE_KEYS.numberSearch, numberSearch);
  }, [activeTab, employeeSearch, numberSearch]);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-lg">
              <PbxProviderLogo providerId="megafon" />
              АТС
            </CardTitle>
            <CardDescription className="mt-1">
              Подключение провайдера телефонии, синхронизация сотрудников, номеров и звонков, а
              также ручная привязка к пользователям компании.
            </CardDescription>
          </div>
          <label
            htmlFor="megapbx-enabled"
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-muted/50 px-4 py-3 transition-colors hover:bg-muted has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring"
          >
            <Checkbox
              id="megapbx-enabled"
              checked={enabled}
              disabled={saving}
              onCheckedChange={(checked) => onEnabledChange(checked === true)}
            />
            <span className="text-sm font-semibold">
              {enabled ? "Интеграция включена" : "Интеграция выключена"}
            </span>
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryTile
            label="Статус"
            value={enabled ? "Включено" : "Выключено"}
            hint={enabled ? "Интеграция участвует в синхронизации" : "Интеграция не используется"}
          />
          <SummaryTile
            label="Подключение"
            value={hasConnection ? "Готово" : "Не настроено"}
            hint={hasConnection ? "Base URL и API key заданы" : "Заполните доступ"}
          />
          <SummaryTile
            label="Сотрудники"
            value={String(employees.length)}
            hint={`Активных: ${activeEmployees}, привязано: ${linkedEmployees}`}
          />
          <SummaryTile
            label="Номера"
            value={String(numbers.length)}
            hint={`Привязано: ${linkedNumbers}`}
          />
        </div>

        <div className="sticky top-20 z-10 -mx-2 px-2 py-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="line" className="grid h-auto w-full grid-cols-3">
              <TabsTrigger value="overview" variant="line">
                Обзор
              </TabsTrigger>
              <TabsTrigger value="employees" variant="line">
                Сотрудники
              </TabsTrigger>
              <TabsTrigger value="numbers" variant="line">
                Номера
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {activeTab === "overview" && (
          <OverviewTab
            megaPbx={megaPbx}
            baseUrl={baseUrl}
            apiKeySet={apiKeySet}
            hasConnection={hasConnection}
            configuredFeatures={configuredFeatures}
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

        {activeTab !== "overview" && <Separator />}

        {activeTab === "employees" && (
          <EmployeesTab
            employees={employees}
            employeesLoading={employeesLoading}
            employeeSearch={employeeSearch}
            onEmployeeSearchChange={setEmployeeSearch}
            employeeLinkOptions={employeeLinkOptions}
            onLink={onLink}
            onUnlink={onUnlink}
          />
        )}

        {activeTab === "numbers" && (
          <NumbersTab
            numbers={numbers}
            numbersLoading={numbersLoading}
            numberSearch={numberSearch}
            onNumberSearchChange={setNumberSearch}
            numberLinkOptions={numberLinkOptions}
            onLink={onLink}
            onUnlink={onUnlink}
            excludedPhoneNumbers={excludedPhoneNumbers}
            savingExcludedNumbers={savingExcludedNumbers}
            onSaveExcludedNumbers={onSaveExcludedNumbers}
          />
        )}
      </CardContent>
    </Card>
  );
}
