"use client";

import { paths } from "@calls/config";
import { Button, Card, Checkbox, Input, PasswordInput, Separator, toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Key, Loader2, Phone, RefreshCw, Search, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const ITEMS_PER_PAGE = 50;

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
  const [baseUrlError, setBaseUrlError] = useState<string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [configSaved, setConfigSaved] = useState(false);
  const baseUrlInputRef = useRef<HTMLInputElement>(null);
  const apiKeyInputRef = useRef<HTMLInputElement>(null);

  // Selection state
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());

  // Search and pagination state
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [numberSearch, setNumberSearch] = useState("");
  const [employeePage, setEmployeePage] = useState(0);
  const [numberPage, setNumberPage] = useState(0);

  // Queries
  const { data: employeesData } = useQuery(orpc.settings.listPbxEmployees.queryOptions({}));
  const employees = (employeesData ?? []) as Employee[];

  const { data: numbersData } = useQuery(orpc.settings.listPbxNumbers.queryOptions({}));
  const numbers = (numbersData ?? []) as Number[];

  // Filtered and paginated data
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const search = employeeSearch.toLowerCase();
    return employees.filter(
      (e) =>
        e.displayName.toLowerCase().includes(search) ||
        e.extension?.toLowerCase().includes(search) ||
        e.email?.toLowerCase().includes(search),
    );
  }, [employees, employeeSearch]);

  const filteredNumbers = useMemo(() => {
    if (!numberSearch.trim()) return numbers;
    const search = numberSearch.toLowerCase();
    return numbers.filter(
      (n) =>
        n.phoneNumber.toLowerCase().includes(search) ||
        n.extension?.toLowerCase().includes(search) ||
        n.label?.toLowerCase().includes(search) ||
        n.employee?.displayName.toLowerCase().includes(search),
    );
  }, [numbers, numberSearch]);

  const paginatedEmployees = useMemo(() => {
    const start = employeePage * ITEMS_PER_PAGE;
    return filteredEmployees.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEmployees, employeePage]);

  const paginatedNumbers = useMemo(() => {
    const start = numberPage * ITEMS_PER_PAGE;
    return filteredNumbers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredNumbers, numberPage]);

  const totalEmployeePages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const totalNumberPages = Math.ceil(filteredNumbers.length / ITEMS_PER_PAGE);

  // Derived selectAll flags (only for current page)
  const allEmployeesSelected =
    paginatedEmployees.length > 0 && paginatedEmployees.every((e) => selectedEmployees.has(e.id));
  const allNumbersSelected =
    paginatedNumbers.length > 0 && paginatedNumbers.every((n) => selectedNumbers.has(n.id));

  // Mutations
  const testPbxMutation = useMutation(orpc.settings.testPbx.mutationOptions());
  const updatePbxAccessMutation = useMutation(orpc.settings.updatePbxAccess.mutationOptions());
  const updatePbxWebhookMutation = useMutation(orpc.settings.updatePbxWebhook.mutationOptions());
  const syncPbxDirectoryMutation = useMutation(orpc.settings.syncPbxDirectory.mutationOptions());
  const importPbxDirectoryMutation = useMutation(
    orpc.settings.importPbxDirectory.mutationOptions(),
  );

  const testAndSaveMutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = `test-and-save-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const result = await testPbxMutation.mutateAsync({
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        idempotencyKey,
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
      toast.info("Синхронизация поставлена в очередь. Ожидание завершения...");

      // Store initial counts to detect when sync completes
      const initialEmployees =
        queryClient.getQueryData<Employee[]>(orpc.settings.listPbxEmployees.queryKey()) ?? [];
      const initialNumbers =
        queryClient.getQueryData<Number[]>(orpc.settings.listPbxNumbers.queryKey()) ?? [];
      const initialEmployeeCount = initialEmployees.length;
      const initialNumberCount = initialNumbers.length;

      // Poll for completion every 3 seconds
      const pollInterval = setInterval(async () => {
        try {
          // Fetch latest data
          const [employeesData, numbersData] = await Promise.all([
            queryClient.fetchQuery(orpc.settings.listPbxEmployees.queryOptions()),
            queryClient.fetchQuery(orpc.settings.listPbxNumbers.queryOptions()),
          ]);

          const employees = (employeesData ?? []) as Employee[];
          const numbers = (numbersData ?? []) as Number[];

          // Check if data has changed (indicating sync completed)
          const hasChanges =
            employees.length !== initialEmployeeCount ||
            numbers.length !== initialNumberCount ||
            JSON.stringify(employees.map((e) => e.id)) !==
              JSON.stringify(initialEmployees.map((e) => e.id));

          if (hasChanges) {
            clearInterval(pollInterval);

            // Invalidate queries to refresh the UI
            await queryClient.invalidateQueries({
              queryKey: orpc.settings.listPbxEmployees.queryKey(),
            });
            await queryClient.invalidateQueries({
              queryKey: orpc.settings.listPbxNumbers.queryKey(),
            });

            // Reset pagination when data changes
            setEmployeePage(0);
            setNumberPage(0);

            toast.success("Синхронизация выполнена");
          }
        } catch {
          // Continue polling on error
        }
      }, 3000);

      // Stop polling after 5 minutes (max wait time)
      setTimeout(
        () => {
          clearInterval(pollInterval);
        },
        5 * 60 * 1000,
      );
    },
    onError: () => {
      toast.error("Ошибка синхронизации");
    },
  });

  // Handlers
  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован в буфер обмена`);
  }, []);

  const handleTestAndSave = useCallback(() => {
    // Clear previous errors
    setBaseUrlError(null);
    setApiKeyError(null);

    // Validate fields
    let hasError = false;
    const trimmedBaseUrl = baseUrl.trim();
    const trimmedApiKey = apiKey.trim();

    if (!trimmedBaseUrl) {
      setBaseUrlError("Введите Base URL");
      hasError = true;
    } else if (!trimmedBaseUrl.startsWith("http://") && !trimmedBaseUrl.startsWith("https://")) {
      setBaseUrlError("URL должен начинаться с http:// или https://");
      hasError = true;
    }

    if (!trimmedApiKey) {
      setApiKeyError("Введите API Key");
      hasError = true;
    }

    if (hasError) {
      // Focus the first invalid field
      if (
        !trimmedBaseUrl ||
        (!trimmedBaseUrl.startsWith("http://") && !trimmedBaseUrl.startsWith("https://"))
      ) {
        baseUrlInputRef.current?.focus();
      } else {
        apiKeyInputRef.current?.focus();
      }
      return;
    }

    testAndSaveMutation.mutate();
  }, [testAndSaveMutation, baseUrl, apiKey]);

  const handleSync = useCallback(() => {
    syncMutation.mutate();
  }, [syncMutation]);

  const handleToggleEmployee = useCallback((id: string) => {
    setSelectedEmployees((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleToggleNumber = useCallback((id: string) => {
    setSelectedNumbers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllEmployees = useCallback(() => {
    setSelectedEmployees((prev) => {
      const newSet = new Set(prev);
      if (allEmployeesSelected) {
        // Unselect all on current page
        paginatedEmployees.forEach((e) => newSet.delete(e.id));
      } else {
        // Select all on current page
        paginatedEmployees.forEach((e) => newSet.add(e.id));
      }
      return newSet;
    });
  }, [allEmployeesSelected, paginatedEmployees]);

  const handleSelectAllNumbers = useCallback(() => {
    setSelectedNumbers((prev) => {
      const newSet = new Set(prev);
      if (allNumbersSelected) {
        // Unselect all on current page
        paginatedNumbers.forEach((n) => newSet.delete(n.id));
      } else {
        // Select all on current page
        paginatedNumbers.forEach((n) => newSet.add(n.id));
      }
      return newSet;
    });
  }, [allNumbersSelected, paginatedNumbers]);

  const handleSelectAllFilteredEmployees = useCallback(() => {
    setSelectedEmployees((prev) => {
      const newSet = new Set(prev);
      filteredEmployees.forEach((e) => newSet.add(e.id));
      return newSet;
    });
    toast.success(`Выбрано ${filteredEmployees.length} сотрудников`);
  }, [filteredEmployees]);

  const handleSelectAllFilteredNumbers = useCallback(() => {
    setSelectedNumbers((prev) => {
      const newSet = new Set(prev);
      filteredNumbers.forEach((n) => newSet.add(n.id));
      return newSet;
    });
    toast.success(`Выбрано ${filteredNumbers.length} номеров`);
  }, [filteredNumbers]);

  const handleClearEmployeeSearch = useCallback(() => {
    setEmployeeSearch("");
    setEmployeePage(0);
  }, []);

  const handleClearNumberSearch = useCallback(() => {
    setNumberSearch("");
    setNumberPage(0);
  }, []);

  const handleImport = useCallback(async () => {
    if (selectedEmployees.size === 0 && selectedNumbers.size === 0) {
      toast.error("Выберите хотя бы одного сотрудника или номер для импорта");
      return;
    }

    try {
      const result = await importPbxDirectoryMutation.mutateAsync({
        employeeIds: Array.from(selectedEmployees),
        numberIds: Array.from(selectedNumbers),
      });

      toast.success(
        `Импортировано ${result.importedEmployees} сотрудников и ${result.importedNumbers} номеров`,
      );
      router.push(paths.root);
    } catch {
      toast.error("Ошибка при импорте. Попробуйте снова.");
    }
  }, [selectedEmployees, selectedNumbers, importPbxDirectoryMutation, router]);

  const hasData = employees.length > 0 || numbers.length > 0;

  return (
    <>
      <Header user={null} />

      <main className="main-content">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Подключение API телефонии</h1>
            <p className="text-muted-foreground">
              Настройте интеграцию и импортируйте сотрудников и номера
            </p>
          </div>

          {/* Webhook Config */}
          <Card className="mb-6 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Key className="size-5 text-primary" />
              Настройка вебхука
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Укажите эти данные в настройках вашей АТС для получения событий о звонках
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">URL вебхука</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-sm">
                    {webhookUrl || "Загрузка..."}
                  </code>
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
                <label className="mb-1 block text-sm font-medium">
                  Секретный ключ (X-Webhook-Signature)
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-3 py-2 text-sm font-mono">
                    {webhookSecretLoading ? "Загрузка..." : webhookSecret}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleCopy(webhookSecret, "Секрет")}
                    disabled={!webhookSecret}
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
              <RefreshCw className="size-5 text-primary" />
              Настройки API
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Base URL</label>
                <Input
                  ref={baseUrlInputRef}
                  value={baseUrl}
                  onChange={(e) => {
                    setBaseUrl(e.target.value);
                    if (baseUrlError) setBaseUrlError(null);
                  }}
                  placeholder="https://...megapbx.ru/crmapi/v1"
                  disabled={configSaved}
                  aria-invalid={baseUrlError ? "true" : "false"}
                />
                {baseUrlError && <p className="mt-1 text-sm text-destructive">{baseUrlError}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">API Key</label>
                <PasswordInput
                  ref={apiKeyInputRef}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    if (apiKeyError) setApiKeyError(null);
                  }}
                  placeholder="Ключ авторизации"
                  disabled={configSaved}
                  aria-invalid={apiKeyError ? "true" : "false"}
                />
                {apiKeyError && <p className="mt-1 text-sm text-destructive">{apiKeyError}</p>}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleTestAndSave}
                  disabled={testAndSaveMutation.isPending || configSaved}
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
                  <p className="text-sm text-muted-foreground">
                    Получите список сотрудников и номеров из АТС
                  </p>
                </div>
                <Button onClick={handleSync} disabled={syncMutation.isPending}>
                  {syncMutation.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 size-4" />
                  )}
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
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Users className="size-5 text-primary" />
                    Сотрудники ({employees.length} всего, выбрано {selectedEmployees.size})
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Поиск сотрудников..."
                        value={employeeSearch}
                        onChange={(e) => {
                          setEmployeeSearch(e.target.value);
                          setEmployeePage(0);
                        }}
                        className="pl-9 pr-9"
                      />
                      {employeeSearch && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute right-1 top-1/2 size-6 -translate-y-1/2"
                          onClick={handleClearEmployeeSearch}
                          aria-label="Очистить поиск сотрудников"
                        >
                          <X className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {filteredEmployees.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Checkbox
                      checked={allEmployeesSelected}
                      onCheckedChange={handleSelectAllEmployees}
                      id="select-all-employees-page"
                    />
                    <label htmlFor="select-all-employees-page" className="text-sm">
                      Выбрать всех на странице ({paginatedEmployees.length})
                    </label>
                    {filteredEmployees.length > ITEMS_PER_PAGE && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSelectAllFilteredEmployees}
                        className="text-xs"
                      >
                        Выбрать все найденные ({filteredEmployees.length})
                      </Button>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {paginatedEmployees.map((employee) => (
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
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{employee.displayName}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {employee.extension && `Внутр. номер: ${employee.extension}`}
                          {employee.email && ` • ${employee.email}`}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Employee Pagination */}
                {totalEmployeePages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Страница {employeePage + 1} из {totalEmployeePages} (
                      {filteredEmployees.length} всего)
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEmployeePage((p) => Math.max(0, p - 1))}
                        disabled={employeePage === 0}
                      >
                        Назад
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEmployeePage((p) => Math.min(totalEmployeePages - 1, p + 1))
                        }
                        disabled={employeePage >= totalEmployeePages - 1}
                      >
                        Вперёд
                      </Button>
                    </div>
                  </div>
                )}

                {filteredEmployees.length === 0 && employeeSearch && (
                  <div className="py-8 text-center text-muted-foreground">Ничего не найдено</div>
                )}
              </Card>

              {/* Numbers */}
              <Card className="mb-6 p-6">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <Phone className="size-5 text-primary" />
                    Номера ({numbers.length} всего, выбрано {selectedNumbers.size})
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Поиск номеров..."
                        value={numberSearch}
                        onChange={(e) => {
                          setNumberSearch(e.target.value);
                          setNumberPage(0);
                        }}
                        className="pl-9 pr-9"
                      />
                      {numberSearch && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute right-1 top-1/2 size-6 -translate-y-1/2"
                          onClick={handleClearNumberSearch}
                          aria-label="Очистить поиск номеров"
                        >
                          <X className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {filteredNumbers.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Checkbox
                      checked={allNumbersSelected}
                      onCheckedChange={handleSelectAllNumbers}
                      id="select-all-numbers-page"
                    />
                    <label htmlFor="select-all-numbers-page" className="text-sm">
                      Выбрать все на странице ({paginatedNumbers.length})
                    </label>
                    {filteredNumbers.length > ITEMS_PER_PAGE && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSelectAllFilteredNumbers}
                        className="text-xs"
                      >
                        Выбрать все найденные ({filteredNumbers.length})
                      </Button>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {paginatedNumbers.map((number) => (
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
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{number.phoneNumber}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {number.label && `${number.label}`}
                          {number.employee && ` • ${number.employee.displayName}`}
                          {number.lineType && ` • ${number.lineType}`}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Number Pagination */}
                {totalNumberPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Страница {numberPage + 1} из {totalNumberPages} ({filteredNumbers.length}{" "}
                      всего)
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNumberPage((p) => Math.max(0, p - 1))}
                        disabled={numberPage === 0}
                      >
                        Назад
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNumberPage((p) => Math.min(totalNumberPages - 1, p + 1))}
                        disabled={numberPage >= totalNumberPages - 1}
                      >
                        Вперёд
                      </Button>
                    </div>
                  </div>
                )}

                {filteredNumbers.length === 0 && numberSearch && (
                  <div className="py-8 text-center text-muted-foreground">Ничего не найдено</div>
                )}
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
                  Импортировать выбранное ({selectedEmployees.size} сотрудников,{" "}
                  {selectedNumbers.size} номеров)
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
