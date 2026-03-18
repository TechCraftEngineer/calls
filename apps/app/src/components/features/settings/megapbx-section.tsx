"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  DataGrid,
  DataGridContainer,
  DataGridPagination,
  DataGridTable,
  DatePicker,
  Input,
  Label,
  PasswordInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@calls/ui";
import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { PbxProviderLogo } from "@/components/features/settings/pbx-provider-logo";
import { SearchInput } from "@/components/ui/search-input";
import type { PbxSectionProps } from "./types";

const STORAGE_KEYS = {
  tab: "settings-pbx-megafon-tab",
  employeeSearch: "settings-pbx-megafon-employee-search",
  numberSearch: "settings-pbx-megafon-number-search",
} as const;

function LinkStatus({
  linkedUser,
  linkedInvitation,
}: {
  linkedUser?: { email: string; name: string } | null;
  linkedInvitation?: { email: string; role: string } | null;
}) {
  if (linkedUser) {
    return <Badge>{linkedUser.name || linkedUser.email}</Badge>;
  }
  if (linkedInvitation) {
    return <Badge variant="secondary">{linkedInvitation.email}</Badge>;
  }
  return <Badge variant="outline">Не привязан</Badge>;
}

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="overflow-hidden border-border/60">
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1.5 text-lg font-semibold">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function SectionBlock({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-border/60">
      <CardHeader className="border-b border-border/60 bg-muted/30 px-6 py-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );
}

export default function MegaPbxSection({
  prompts,
  onPromptValueChange,
  onPromptChange,
  onToggleChange,
  onSave,
  onTest,
  onSyncDirectory,
  onSyncCalls,
  onSyncRecordings,
  onLink,
  onUnlink,
  saving,
  testing,
  syncing,
  testMessage,
  employeesLoading,
  numbersLoading,
  employees,
  numbers,
}: PbxSectionProps) {
  const [selectedLinks, setSelectedLinks] = useState<Record<string, string>>(
    {},
  );
  const [activeTab, setActiveTab] = useState("overview");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [numberSearch, setNumberSearch] = useState("");
  const enabled = prompts.megapbx_enabled?.value === "true";
  const baseUrl = prompts.megapbx_base_url?.value ?? "";
  const apiKeySet = Boolean(prompts.megapbx_api_key?.meta?.passwordSet);
  const hasConnection = Boolean(baseUrl.trim()) && apiKeySet;
  const linkedEmployees = employees.filter((item) => Boolean(item.link)).length;
  const linkedNumbers = numbers.filter((item) => Boolean(item.link)).length;
  const activeEmployees = employees.filter((item) => item.isActive).length;
  const configuredFeatures = [
    prompts.megapbx_sync_employees?.value === "true" ? "Сотрудники" : null,
    prompts.megapbx_sync_numbers?.value === "true" ? "Номера" : null,
    prompts.megapbx_sync_calls?.value === "true" ? "Звонки" : null,
    prompts.megapbx_sync_recordings?.value === "true" ? "Записи" : null,
    prompts.megapbx_webhooks_enabled?.value === "true" ? "Вебхуки" : null,
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
          number.candidates.map((candidate) => ({
            value: `user:${candidate.id}`,
            label: `${candidate.name || candidate.email} (${candidate.email})`,
          })),
        ]),
      ),
    [numbers],
  );

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query) return employees;

    return employees.filter((employee) =>
      [
        employee.displayName,
        employee.email,
        employee.extension,
        employee.linkedUser?.email,
        employee.linkedUser?.name,
        employee.linkedInvitation?.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [employeeSearch, employees]);

  const filteredNumbers = useMemo(() => {
    const query = numberSearch.trim().toLowerCase();
    if (!query) return numbers;

    return numbers.filter((number) =>
      [
        number.phoneNumber,
        number.extension,
        number.employee?.displayName,
        number.linkedUser?.email,
        number.linkedUser?.name,
        number.linkedInvitation?.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [numberSearch, numbers]);

  const employeeColumns = useMemo<ColumnDef<(typeof employees)[0]>[]>(
    () => [
      {
        accessorKey: "displayName",
        header: "Сотрудник",
        cell: ({ row }) => row.original.displayName,
      },
      {
        accessorKey: "extension",
        header: "Внутренний",
        cell: ({ row }) => row.original.extension ?? "—",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email ?? "—",
      },
      {
        id: "status",
        header: "Статус",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "secondary"}>
            {row.original.isActive ? "Активен" : "Неактивен"}
          </Badge>
        ),
      },
      {
        id: "link",
        header: "Привязка",
        cell: ({ row }) => (
          <LinkStatus
            linkedUser={row.original.linkedUser}
            linkedInvitation={row.original.linkedInvitation}
          />
        ),
      },
      {
        id: "actions",
        header: "Действие",
        enableSorting: false,
        cell: ({ row }) => {
          const employee = row.original;
          const options = employeeLinkOptions[employee.externalId] ?? [];

          return (
            <div className="flex min-w-65 flex-wrap items-center gap-2">
              {options.length > 0 && (
                <Select
                  value={selectedLinks[employee.externalId] ?? ""}
                  onValueChange={(value) =>
                    setSelectedLinks((prev) => ({
                      ...prev,
                      [employee.externalId]: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-65">
                    <SelectValue placeholder="Выберите связь" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedLinks[employee.externalId]}
                onClick={() => {
                  const selected = selectedLinks[employee.externalId];
                  if (!selected) return;
                  const [kind, id] = selected.split(":");
                  void onLink({
                    targetType: "employee",
                    targetExternalId: employee.externalId,
                    userId: kind === "user" ? id : null,
                    invitationId: kind === "invite" ? id : null,
                  });
                }}
              >
                Привязать
              </Button>
              {employee.link && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void onUnlink({
                      targetType: "employee",
                      targetExternalId: employee.externalId,
                    })
                  }
                >
                  Отвязать
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [employeeLinkOptions, onLink, onUnlink, selectedLinks],
  );

  const numberColumns = useMemo<ColumnDef<(typeof numbers)[0]>[]>(
    () => [
      {
        accessorKey: "phoneNumber",
        header: "Номер",
        cell: ({ row }) => row.original.phoneNumber,
      },
      {
        accessorKey: "extension",
        header: "Extension",
        cell: ({ row }) => row.original.extension ?? "—",
      },
      {
        id: "employee",
        header: "Сотрудник",
        cell: ({ row }) => row.original.employee?.displayName ?? "—",
      },
      {
        id: "link",
        header: "Привязка",
        cell: ({ row }) => (
          <LinkStatus
            linkedUser={row.original.linkedUser}
            linkedInvitation={row.original.linkedInvitation}
          />
        ),
      },
      {
        id: "actions",
        header: "Действие",
        enableSorting: false,
        cell: ({ row }) => {
          const number = row.original;
          const options = numberLinkOptions[number.externalId] ?? [];

          return (
            <div className="flex min-w-65 flex-wrap items-center gap-2">
              {options.length > 0 && (
                <Select
                  value={selectedLinks[number.externalId] ?? ""}
                  onValueChange={(value) =>
                    setSelectedLinks((prev) => ({
                      ...prev,
                      [number.externalId]: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-65">
                    <SelectValue placeholder="Выберите пользователя" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedLinks[number.externalId]}
                onClick={() => {
                  const selected = selectedLinks[number.externalId];
                  if (!selected) return;
                  const [, id] = selected.split(":");
                  void onLink({
                    targetType: "number",
                    targetExternalId: number.externalId,
                    userId: id,
                  });
                }}
              >
                Привязать
              </Button>
              {number.link && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void onUnlink({
                      targetType: "number",
                      targetExternalId: number.externalId,
                    })
                  }
                >
                  Отвязать
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [numberLinkOptions, onLink, onUnlink, selectedLinks],
  );

  const employeeTable = useReactTable({
    data: filteredEmployees,
    columns: employeeColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      sorting: [{ id: "displayName", desc: false }],
      pagination: { pageIndex: 0, pageSize: 20 },
    },
  });

  const numberTable = useReactTable({
    data: filteredNumbers,
    columns: numberColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      sorting: [{ id: "phoneNumber", desc: false }],
      pagination: { pageIndex: 0, pageSize: 20 },
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedTab = window.localStorage.getItem(STORAGE_KEYS.tab);
    const savedEmployeeSearch = window.localStorage.getItem(
      STORAGE_KEYS.employeeSearch,
    );
    const savedNumberSearch = window.localStorage.getItem(
      STORAGE_KEYS.numberSearch,
    );

    if (savedTab) setActiveTab(savedTab);
    if (savedEmployeeSearch) setEmployeeSearch(savedEmployeeSearch);
    if (savedNumberSearch) setNumberSearch(savedNumberSearch);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.tab, activeTab);
  }, [activeTab]);

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
              Подключение провайдера телефонии, синхронизация сотрудников,
              номеров и звонков, а также ручная привязка к пользователям
              рабочего пространства.
            </CardDescription>
          </div>
          <label
            htmlFor="megapbx-enabled"
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-muted/50 px-4 py-3 transition-colors hover:bg-muted has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring"
          >
            <Checkbox
              id="megapbx-enabled"
              checked={enabled}
              onCheckedChange={(checked) =>
                onToggleChange("megapbx_enabled", checked === true)
              }
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
            hint={
              enabled
                ? "Интеграция участвует в синхронизации"
                : "Интеграция не используется"
            }
          />
          <SummaryTile
            label="Подключение"
            value={hasConnection ? "Готово" : "Не настроено"}
            hint={
              hasConnection ? "Base URL и API key заданы" : "Заполните доступ"
            }
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

        <div className="sticky top-20 z-10 -mx-2 rounded-lg border border-border/60 bg-card px-2 py-2 shadow-sm backdrop-blur supports-backdrop-filter:bg-card/95">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-lg border-0 bg-muted/50 p-1">
              <TabsTrigger value="overview" className="rounded-md">
                Обзор
              </TabsTrigger>
              <TabsTrigger value="employees" className="rounded-md">
                Сотрудники
              </TabsTrigger>
              <TabsTrigger value="numbers" className="rounded-md">
                Номера
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {activeTab === "overview" && (
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void onSave();
            }}
          >
            <SectionBlock
              title="Доступ к API"
              description="Укажите домен АТС и API key. Этого достаточно для проверки соединения и запуска синхронизации."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="megapbx-base-url"
                    className="text-xs text-muted-foreground"
                  >
                    Base URL / домен АТС
                  </Label>
                  <Input
                    id="megapbx-base-url"
                    value={baseUrl}
                    onChange={onPromptChange("megapbx_base_url", "value")}
                    placeholder="https://123456.megapbx.ru"
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Можно указать полный URL или только домен.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="megapbx-api-key"
                    className="text-xs text-muted-foreground"
                  >
                    API key
                  </Label>
                  <PasswordInput
                    id="megapbx-api-key"
                    value={prompts.megapbx_api_key?.value ?? ""}
                    onChange={onPromptChange("megapbx_api_key", "value")}
                    placeholder={
                      prompts.megapbx_api_key?.meta?.passwordSet
                        ? "•••••••• (оставьте пустым, чтобы не менять)"
                        : "Ключ авторизации"
                    }
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ключ хранится в зашифрованном виде.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="megapbx-sync-from-date"
                    className="text-xs text-muted-foreground"
                  >
                    Импорт звонков с даты
                  </Label>
                  <DatePicker
                    id="megapbx-sync-from-date"
                    value={prompts.megapbx_sync_from_date?.value ?? ""}
                    onChange={(value) =>
                      onPromptValueChange("megapbx_sync_from_date", value)
                    }
                    placeholder="Выберите дату"
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Используется как стартовая дата для первой загрузки истории
                    звонков.
                  </p>
                </div>
              </div>
            </SectionBlock>

            <SectionBlock
              title="Что синхронизировать"
              description="Включите только те данные, которые реально нужны в рабочем пространстве."
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {[
                  [
                    "megapbx_sync_employees",
                    "Сотрудники",
                    "Справочник сотрудников из АТС",
                  ],
                  [
                    "megapbx_sync_numbers",
                    "Номера",
                    "Внешние и внутренние номера",
                  ],
                  [
                    "megapbx_sync_calls",
                    "Звонки",
                    "Импорт истории звонков в систему",
                  ],
                  [
                    "megapbx_sync_recordings",
                    "Записи",
                    "Загрузка и привязка аудиофайлов",
                  ],
                  [
                    "megapbx_webhooks_enabled",
                    "Вебхуки",
                    "Быстрый запуск синка по событию",
                  ],
                ].map(([key, label, hint]) => (
                  <label
                    key={key}
                    className="flex min-h-24 cursor-pointer flex-col gap-3 rounded-lg border border-border/60 bg-card p-4 transition-colors hover:bg-muted/50 has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{label}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {hint}
                        </div>
                      </div>
                      <Checkbox
                        checked={prompts[key]?.value === "true"}
                        onCheckedChange={(checked) =>
                          onToggleChange(key, checked === true)
                        }
                      />
                    </div>
                  </label>
                ))}
              </div>
              {configuredFeatures.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {configuredFeatures.map((feature) => (
                    <Badge key={feature} variant="outline">
                      {feature}
                    </Badge>
                  ))}
                </div>
              )}
            </SectionBlock>

            <SectionBlock
              title="Секрет вебхука"
              description="Нужен только если используете вебхуки от АТС. Если уже сохранён, поле можно оставить пустым."
            >
              <div className="grid gap-4 md:grid-cols-[minmax(0,420px)_1fr]">
                <div className="space-y-2">
                  <Label
                    htmlFor="megapbx-webhook-secret"
                    className="text-xs text-muted-foreground"
                  >
                    Секрет вебхука
                  </Label>
                  <PasswordInput
                    id="megapbx-webhook-secret"
                    value={prompts.megapbx_webhook_secret?.value ?? ""}
                    onChange={onPromptChange("megapbx_webhook_secret", "value")}
                    placeholder={
                      prompts.megapbx_webhook_secret?.meta?.passwordSet
                        ? "•••••••• (оставьте пустым, чтобы не менять)"
                        : "Секрет для проверки входящих webhook"
                    }
                    className="h-10"
                  />
                </div>
                <Card className="rounded-lg border-border/60">
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    Используется для проверки входящих запросов от АТС. Если
                    вебхуки не включены, это поле можно не заполнять.
                  </CardContent>
                </Card>
              </div>
            </SectionBlock>

            {testMessage && (
              <Card className="rounded-lg border-border/60">
                <CardContent className="px-4 py-3 text-sm">
                  {testMessage}
                </CardContent>
              </Card>
            )}

            <SectionBlock
              title="Быстрые действия"
              description="Сначала сохраните настройки, затем проверьте доступ и при необходимости вручную запустите синхронизацию."
            >
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
                <Card className="rounded-lg border-border/60 xl:col-span-2">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium">
                      Настройки подключения
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Сохранение и проверка доступа к API Мегафона.
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={onTest}
                        disabled={testing || !baseUrl.trim()}
                      >
                        {testing ? "Проверка…" : "Проверить API"}
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Сохранение…" : "Сохранить"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-lg border-border/60">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium">Справочник</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Сотрудники и номера
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onSyncDirectory}
                      disabled={syncing !== null}
                      className="mt-4 w-full"
                    >
                      {syncing === "directory" ? "Синк…" : "Запустить"}
                    </Button>
                  </CardContent>
                </Card>
                <Card className="rounded-lg border-border/60">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium">Звонки</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Импорт истории вызовов
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onSyncCalls}
                      disabled={syncing !== null}
                      className="mt-4 w-full"
                    >
                      {syncing === "calls" ? "Синк…" : "Запустить"}
                    </Button>
                  </CardContent>
                </Card>
                <Card className="rounded-lg border-border/60">
                  <CardContent className="p-4">
                    <div className="text-sm font-medium">Записи</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Загрузка аудио по звонкам
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onSyncRecordings}
                      disabled={syncing !== null}
                      className="mt-4 w-full"
                    >
                      {syncing === "recordings" ? "Синк…" : "Запустить"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </SectionBlock>
          </form>
        )}

        {activeTab !== "overview" && <Separator />}

        {activeTab === "employees" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h4 className="font-semibold">Привязка сотрудников</h4>
                <p className="text-sm text-muted-foreground">
                  Сопоставьте сотрудников АТС с пользователями и приглашениями в
                  рабочем пространстве.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <Badge variant="outline">
                  {filteredEmployees.length} записей
                </Badge>
                <SearchInput
                  value={employeeSearch}
                  onChange={setEmployeeSearch}
                  placeholder="Поиск по сотруднику, email, внутреннему номеру..."
                  className="w-full sm:w-90"
                />
              </div>
            </div>
            <Card className="overflow-hidden border-border/60">
              <DataGrid
                table={employeeTable}
                recordCount={filteredEmployees.length}
                isLoading={employeesLoading}
                emptyMessage={
                  employees.length === 0
                    ? "Сотрудники пока не синхронизированы. Сначала запустите синхронизацию справочника."
                    : "По текущему запросу сотрудники не найдены."
                }
                tableLayout={{
                  rowBorder: false,
                  headerBorder: false,
                  headerBackground: true,
                }}
                tableClassNames={{ base: "op-table" }}
              >
                <DataGridContainer className="border-0">
                  <div className="overflow-x-auto">
                    <DataGridTable<(typeof employees)[0]> />
                  </div>
                  <div className="px-4 py-3">
                    <DataGridPagination
                      sizes={[20, 50, 100]}
                      sizesLabel="Строк на странице"
                      info="{from} - {to} из {count}"
                      rowsPerPageLabel="Строк на странице"
                      previousPageLabel="Предыдущая страница"
                      nextPageLabel="Следующая страница"
                    />
                  </div>
                </DataGridContainer>
              </DataGrid>
            </Card>
          </div>
        )}

        {activeTab === "numbers" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h4 className="font-semibold">Привязка номеров</h4>
                <p className="text-sm text-muted-foreground">
                  Используйте сопоставление номеров, если звонки нужно жёстко
                  привязать к конкретным пользователям.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <Badge variant="outline">
                  {filteredNumbers.length} записей
                </Badge>
                <SearchInput
                  value={numberSearch}
                  onChange={setNumberSearch}
                  placeholder="Поиск по номеру, extension, сотруднику..."
                  className="w-full sm:w-[320px]"
                />
              </div>
            </div>
            <Card className="overflow-hidden border-border/60">
              <DataGrid
                table={numberTable}
                recordCount={filteredNumbers.length}
                isLoading={numbersLoading}
                emptyMessage={
                  numbers.length === 0
                    ? "Номера пока не синхронизированы. Сначала загрузите справочник из АТС."
                    : "По текущему запросу номера не найдены."
                }
                tableLayout={{
                  rowBorder: false,
                  headerBorder: false,
                  headerBackground: true,
                }}
                tableClassNames={{ base: "op-table" }}
              >
                <DataGridContainer className="border-0">
                  <div className="overflow-x-auto">
                    <DataGridTable<(typeof numbers)[0]> />
                  </div>
                  <div className="px-4 py-3">
                    <DataGridPagination
                      sizes={[20, 50, 100]}
                      sizesLabel="Строк на странице"
                      info="{from} - {to} из {count}"
                      rowsPerPageLabel="Строк на странице"
                      previousPageLabel="Предыдущая страница"
                      nextPageLabel="Следующая страница"
                    />
                  </div>
                </DataGridContainer>
              </DataGrid>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
