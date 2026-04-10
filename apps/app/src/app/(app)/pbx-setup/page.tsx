"use client";

import { paths } from "@calls/config";
import { Button, Card, Checkbox, Input, PasswordInput, Separator, toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Key, Loader2, Phone, RefreshCw, Users, Webhook } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import Header from "@/components/layout/header";
import { useORPC } from "@/orpc/react";

interface Employee {
  id: string;
  externalId: string;
  displayName: string;
  extension: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
}

interface Number {
  id: string;
  externalId: string;
  phoneNumber: string;
  extension: string | null;
  label: string | null;
  lineType: string | null;
  employee: {
    externalId: string;
    displayName: string;
    extension: string | null;
  } | null;
  isActive: boolean;
}

export default function PbxSetupPage() {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();

  // Webhook config
  const webhookUrl = useMemo(() => {
    if (!activeWorkspace) return "";
    return `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/pbx/${activeWorkspace.id}`;
  }, [activeWorkspace]);

  // Fetch webhook secret from server
  const { data: webhookSecretData, isLoading: webhookSecretLoading } = useQuery({
    ...orpc.settings.getPbxWebhookSecret.queryOptions(),
    enabled: Boolean(activeWorkspace),
  });
  const webhookSecret = webhookSecretData?.webhookSecret ?? "";

  // API config form
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [configSaved, setConfigSaved] = useState(false);

  // Selection state
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());

  // Derived selectAll flags
  const allEmployeesSelected = employees.length > 0 && selectedEmployees.size === employees.length;
  const allNumbersSelected = numbers.length > 0 && selectedNumbers.size === numbers.length;

  // Queries
  const { data: employeesData } = useQuery(
    orpc.settings.listPbxEmployees.queryOptions({})
  );
  const employees = (employeesData ?? []) as Employee[];

  const { data: numbersData } = useQuery(
    orpc.settings.listPbxNumbers.queryOptions({})
  );
  const numbers = (numbersData ?? []) as Number[];

  // Mutations
  const testPbxMutation = useMutation(orpc.settings.testPbx.mutationOptions());
  const updatePbxAccessMutation = useMutation(orpc.settings.updatePbxAccess.mutationOptions());
  const updatePbxWebhookMutation = useMutation(orpc.settings.updatePbxWebhook.mutationOptions());
  const syncPbxDirectoryMutation = useMutation(orpc.settings.syncPbxDirectory.mutationOptions());

  const testAndSaveMutation = useMutation({
    mutationFn: async () => {
      const result = await testPbxMutation.mutateAsync({
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
      });
      if (result && typeof result === "object" && "success" in result && result.success) {
        await updatePbxAccessMutation.mutateAsync({
          enabled: true,
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim(),
        });
        await updatePbxWebhookMutation.mutateAsync({
          webhookSecret,
        });
        return true;
      }
      throw new Error("Проверка не пройдена");
    },
    onSuccess: () => {
      setConfigSaved(true);
      toast.success("API подключено");
    },
    onError: () => {
      toast.error("Не удалось подключиться к API");
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const result = await syncPbxDirectoryMutation.mutateAsync({});
      return result;
    },
    onSuccess: async () => {
      toast.success("Синхронизация выполнена");
      await queryClient.invalidateQueries({ queryKey: orpc.settings.listPbxEmployees.queryKey() });
      await queryClient.invalidateQueries({ queryKey: orpc.settings.listPbxNumbers.queryKey() });
    },
    onError: () => {
      toast.error("Ошибка синхронизации");
    },
  });

  // Handlers
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован в буфер обмена`);
  };

  const handleTestAndSave = () => {
    testAndSaveMutation.mutate();
  };

  const handleSync = () => {
    syncMutation.mutate();
  };

  const handleToggleEmployee = (id: string) => {
    const newSet = new Set(selectedEmployees);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedEmployees(newSet);
  };

  const handleToggleNumber = (id: string) => {
    const newSet = new Set(selectedNumbers);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedNumbers(newSet);
  };

  const handleSelectAllEmployees = () => {
    if (allEmployeesSelected) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees.map((e) => e.id)));
    }
  };

  const handleSelectAllNumbers = () => {
    if (allNumbersSelected) {
      setSelectedNumbers(new Set());
    } else {
      setSelectedNumbers(new Set(numbers.map((n) => n.id)));
    }
  };

  const handleImport = () => {
    toast.success(`Импортировано ${selectedEmployees.size} сотрудников и ${selectedNumbers.size} номеров`);
    router.push(paths.root);
  };

  const hasData = employees.length > 0 || numbers.length > 0;

  return (
    <>
      <Header user={null} />

      <main className="main-content">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Подключение API телефонии</h1>
            <p className="text-muted-foreground">Настройте интеграцию и импортируйте сотрудников и номера</p>
          </div>

          {/* Webhook Config */}
          <Card className="mb-6 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Webhook className="size-5 text-primary" />
              Настройка вебхука
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Укажите эти данные в настройках вашей АТС для получения событий о звонках
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">URL вебхука</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-sm">{webhookUrl || "Загрузка..."}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleCopy(webhookUrl, "URL")}
                    disabled={!webhookUrl}
                    aria-label="Скопировать URL вебхука"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Секретный ключ (X-Webhook-Signature)</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-sm font-mono">{webhookSecret}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleCopy(webhookSecret, "Секрет")}
                    aria-label="Скопировать секретный ключ"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* API Config */}
          <Card className="mb-6 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Key className="size-5 text-primary" />
              Настройки API
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Base URL</label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://...megapbx.ru/crmapi/v1"
                  disabled={configSaved}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">API Key</label>
                <PasswordInput
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Ключ авторизации"
                  disabled={configSaved}
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleTestAndSave}
                  disabled={!baseUrl || !apiKey || testAndSaveMutation.isPending || configSaved}
                  className="flex-1"
                >
                  {testAndSaveMutation.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : configSaved ? (
                    <Check className="mr-2 size-4" />
                  ) : null}
                  {configSaved ? "Подключено" : "Проверить и сохранить"}
                </Button>

                {configSaved && (
                  <Button variant="outline" onClick={() => setConfigSaved(false)}>
                    Изменить
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Sync Data */}
          {configSaved && (
            <Card className="mb-6 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <RefreshCw className="size-5 text-primary" />
                    Загрузка данных
                  </h2>
                  <p className="text-sm text-muted-foreground">Получите список сотрудников и номеров из АТС</p>
                </div>
                <Button onClick={handleSync} disabled={syncMutation.isPending}>
                  {syncMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
                  Синхронизировать
                </Button>
              </div>
            </Card>
          )}

          {/* Data Selection */}
          {hasData && (
            <>
              <Separator className="my-6" />

              {/* Employees */}
              <Card className="mb-6 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Users className="size-5 text-primary" />
                    Сотрудники ({employees.length})
                  </h2>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allEmployeesSelected}
                      onCheckedChange={handleSelectAllEmployees}
                      id="select-all-employees"
                    />
                    <label htmlFor="select-all-employees" className="text-sm">
                      Выбрать всех
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  {employees.map((employee) => (
                    <label
                      key={employee.id}
                      htmlFor={`checkbox-employee-${employee.id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        id={`checkbox-employee-${employee.id}`}
                        checked={selectedEmployees.has(employee.id)}
                        onCheckedChange={() => handleToggleEmployee(employee.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{employee.displayName}</div>
                        <div className="text-sm text-muted-foreground">
                          {employee.extension && `Внутр. номер: ${employee.extension}`}
                          {employee.email && ` • ${employee.email}`}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </Card>

              {/* Numbers */}
              <Card className="mb-6 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Phone className="size-5 text-primary" />
                    Номера ({numbers.length})
                  </h2>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allNumbersSelected}
                      onCheckedChange={handleSelectAllNumbers}
                      id="select-all-numbers"
                    />
                    <label htmlFor="select-all-numbers" className="text-sm">
                      Выбрать все
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  {numbers.map((number) => (
                    <label
                      key={number.id}
                      htmlFor={`checkbox-number-${number.id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        id={`checkbox-number-${number.id}`}
                        checked={selectedNumbers.has(number.id)}
                        onCheckedChange={() => handleToggleNumber(number.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{number.phoneNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          {number.label && `${number.label}`}
                          {number.employee && ` • ${number.employee.displayName}`}
                          {number.lineType && ` • ${number.lineType}`}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </Card>

              {/* Import Button */}
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={handleImport}
                  disabled={selectedEmployees.size === 0 && selectedNumbers.size === 0}
                  className="px-8"
                >
                  <Check className="mr-2 size-4" />
                  Импортировать выбранное ({selectedEmployees.size} сотрудников, {selectedNumbers.size} номеров)
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
