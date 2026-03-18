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
  Input,
  Label,
  PasswordInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@calls/ui";
import { useMemo, useState } from "react";
import type { PbxSectionProps } from "./types";

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

export default function MegaPbxSection({
  prompts,
  onPromptChange,
  onPromptValueChange,
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
  const enabled = prompts.megapbx_enabled?.value === "true";
  const authScheme = prompts.megapbx_auth_scheme?.value ?? "bearer";

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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                ☎
              </span>
              MegaPBX API
            </CardTitle>
            <CardDescription className="mt-1">
              API-интеграция с MegaPBX: сотрудники, номера, звонки, записи и
              ручная привязка к пользователям рабочего пространства.
            </CardDescription>
          </div>
          <label
            htmlFor="megapbx-enabled"
            className="flex cursor-pointer items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3"
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
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void onSave();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="megapbx-base-url">Base URL / домен АТС</Label>
              <Input
                id="megapbx-base-url"
                value={prompts.megapbx_base_url?.value ?? ""}
                onChange={onPromptChange("megapbx_base_url", "value")}
                placeholder="https://123456.megapbx.ru"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="megapbx-api-key">API key</Label>
              <PasswordInput
                id="megapbx-api-key"
                value={prompts.megapbx_api_key?.value ?? ""}
                onChange={onPromptChange("megapbx_api_key", "value")}
                placeholder={
                  prompts.megapbx_api_key?.meta?.passwordSet
                    ? "•••••••• (оставьте пустым, чтобы не менять)"
                    : "Ключ авторизации"
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Схема авторизации</Label>
              <Select
                value={authScheme}
                onValueChange={(value) =>
                  onPromptValueChange("megapbx_auth_scheme", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите схему" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bearer">Bearer token</SelectItem>
                  <SelectItem value="x-api-key">X-API-Key header</SelectItem>
                  <SelectItem value="query">query param</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="megapbx-api-key-header">
                Имя заголовка API key
              </Label>
              <Input
                id="megapbx-api-key-header"
                value={prompts.megapbx_api_key_header?.value ?? ""}
                onChange={onPromptChange("megapbx_api_key_header", "value")}
                placeholder="X-API-Key"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="megapbx-employees-path">Employees path</Label>
              <Input
                id="megapbx-employees-path"
                value={prompts.megapbx_employees_path?.value ?? ""}
                onChange={onPromptChange("megapbx_employees_path", "value")}
                placeholder="/crm/employees"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="megapbx-numbers-path">Numbers path</Label>
              <Input
                id="megapbx-numbers-path"
                value={prompts.megapbx_numbers_path?.value ?? ""}
                onChange={onPromptChange("megapbx_numbers_path", "value")}
                placeholder="/crm/numbers"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="megapbx-calls-path">Calls path</Label>
              <Input
                id="megapbx-calls-path"
                value={prompts.megapbx_calls_path?.value ?? ""}
                onChange={onPromptChange("megapbx_calls_path", "value")}
                placeholder="/crm/calls"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="megapbx-employees-result-key">
                Employees result key
              </Label>
              <Input
                id="megapbx-employees-result-key"
                value={prompts.megapbx_employees_result_key?.value ?? ""}
                onChange={onPromptChange(
                  "megapbx_employees_result_key",
                  "value",
                )}
                placeholder="items"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="megapbx-numbers-result-key">
                Numbers result key
              </Label>
              <Input
                id="megapbx-numbers-result-key"
                value={prompts.megapbx_numbers_result_key?.value ?? ""}
                onChange={onPromptChange("megapbx_numbers_result_key", "value")}
                placeholder="items"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="megapbx-calls-result-key">Calls result key</Label>
              <Input
                id="megapbx-calls-result-key"
                value={prompts.megapbx_calls_result_key?.value ?? ""}
                onChange={onPromptChange("megapbx_calls_result_key", "value")}
                placeholder="items"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            {[
              ["megapbx_sync_employees", "Сотрудники"],
              ["megapbx_sync_numbers", "Номера"],
              ["megapbx_sync_calls", "Звонки"],
              ["megapbx_sync_recordings", "Записи"],
              ["megapbx_webhooks_enabled", "Вебхуки"],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded border p-3 text-sm"
              >
                <Checkbox
                  checked={prompts[key]?.value === "true"}
                  onCheckedChange={(checked) =>
                    onToggleChange(key, checked === true)
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {testMessage && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              {testMessage}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onTest}
              disabled={testing}
            >
              {testing ? "Проверка…" : "Проверить API"}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onSyncDirectory}
              disabled={syncing !== null}
            >
              {syncing === "directory" ? "Синк…" : "Синк сотрудников и номеров"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onSyncCalls}
              disabled={syncing !== null}
            >
              {syncing === "calls" ? "Синк…" : "Синк звонков"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onSyncRecordings}
              disabled={syncing !== null}
            >
              {syncing === "recordings" ? "Синк…" : "Синк записей"}
            </Button>
          </div>
        </form>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Сотрудники MegaPBX</h4>
            <Badge variant="outline">{employees.length}</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Внутренний</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Привязка</TableHead>
                <TableHead>Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeesLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>Загрузка…</TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    Сотрудники пока не синхронизированы
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee) => {
                  const options =
                    employeeLinkOptions[employee.externalId] ?? [];
                  return (
                    <TableRow key={employee.externalId}>
                      <TableCell>{employee.displayName}</TableCell>
                      <TableCell>{employee.extension ?? "—"}</TableCell>
                      <TableCell>{employee.email ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={employee.isActive ? "default" : "secondary"}
                        >
                          {employee.isActive ? "Активен" : "Неактивен"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <LinkStatus
                          linkedUser={employee.linkedUser}
                          linkedInvitation={employee.linkedInvitation}
                        />
                      </TableCell>
                      <TableCell className="space-x-2">
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
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
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
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Номера MegaPBX</h4>
            <Badge variant="outline">{numbers.length}</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер</TableHead>
                <TableHead>Extension</TableHead>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Привязка</TableHead>
                <TableHead>Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {numbersLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>Загрузка…</TableCell>
                </TableRow>
              ) : numbers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    Номера пока не синхронизированы
                  </TableCell>
                </TableRow>
              ) : (
                numbers.map((number) => {
                  const options = numberLinkOptions[number.externalId] ?? [];
                  return (
                    <TableRow key={number.externalId}>
                      <TableCell>{number.phoneNumber}</TableCell>
                      <TableCell>{number.extension ?? "—"}</TableCell>
                      <TableCell>
                        {number.employee?.displayName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <LinkStatus
                          linkedUser={number.linkedUser}
                          linkedInvitation={number.linkedInvitation}
                        />
                      </TableCell>
                      <TableCell className="space-x-2">
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
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
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
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
