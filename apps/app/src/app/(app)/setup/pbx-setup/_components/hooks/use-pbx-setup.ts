"use client";

import { toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { useORPC } from "@/orpc/react";
import { ITEMS_PER_PAGE } from "../constants";
import type { Employee, PhoneNumber } from "../types";

export interface UsePbxSetupReturn {
  // Webhook
  webhookUrl: string;
  webhookSecret: string;
  webhookSecretLoading: boolean;

  // API Config
  baseUrl: string;
  setBaseUrl: (value: string) => void;
  apiKey: string;
  setApiKey: (value: string) => void;
  baseUrlError: string | null;
  setBaseUrlError: (value: string | null) => void;
  apiKeyError: string | null;
  setApiKeyError: (value: string | null) => void;
  configSaved: boolean;
  setConfigSaved: (value: boolean) => void;
  baseUrlInputRef: React.RefObject<HTMLInputElement | null>;
  apiKeyInputRef: React.RefObject<HTMLInputElement | null>;

  // Data
  employees: Employee[];
  numbers: PhoneNumber[];
  hasData: boolean;

  // Selection
  selectedEmployees: Set<string>;
  selectedNumbers: Set<string>;
  handleToggleEmployee: (id: string) => void;
  handleToggleNumber: (id: string) => void;
  handleSelectAllEmployees: () => void;
  handleSelectAllNumbers: () => void;
  handleSelectAllFilteredEmployees: () => void;
  handleSelectAllFilteredNumbers: () => void;

  // Search & Pagination
  employeeSearch: string;
  setEmployeeSearch: (value: string) => void;
  numberSearch: string;
  setNumberSearch: (value: string) => void;
  employeePage: number;
  setEmployeePage: (value: number | ((prev: number) => number)) => void;
  numberPage: number;
  setNumberPage: (value: number | ((prev: number) => number)) => void;
  filteredEmployees: Employee[];
  filteredNumbers: PhoneNumber[];
  paginatedEmployees: Employee[];
  paginatedNumbers: PhoneNumber[];
  totalEmployeePages: number;
  totalNumberPages: number;
  allEmployeesSelected: boolean;
  allNumbersSelected: boolean;
  handleClearEmployeeSearch: () => void;
  handleClearNumberSearch: () => void;

  // Mutations status
  testAndSaveMutationPending: boolean;
  syncMutationPending: boolean;
  importMutationPending: boolean;

  // Handlers
  handleCopy: (text: string, label: string) => void;
  handleTestAndSave: () => void;
  handleSync: () => void;
  handleImport: () => Promise<void>;
}

export function usePbxSetup(): UsePbxSetupReturn {
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
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Selection state
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());

  // Search and pagination state
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [numberSearch, setNumberSearch] = useState("");
  const [employeePage, setEmployeePage] = useState(0);
  const [numberPage, setNumberPage] = useState(0);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Queries
  const { data: employeesData } = useQuery(orpc.settings.listPbxEmployees.queryOptions({}));
  const employees = (employeesData ?? []) as Employee[];

  const { data: numbersData } = useQuery(orpc.settings.listPbxNumbers.queryOptions({}));
  const numbers = (numbersData ?? []) as PhoneNumber[];

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
        queryClient.getQueryData<PhoneNumber[]>(orpc.settings.listPbxNumbers.queryKey()) ?? [];
      const initialEmployeeCount = initialEmployees.length;
      const initialNumberCount = initialNumbers.length;

      // Clear any existing polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Poll for completion every 3 seconds
      pollIntervalRef.current = setInterval(async () => {
        try {
          // Fetch latest data
          const [employeesData, numbersData] = await Promise.all([
            queryClient.fetchQuery(orpc.settings.listPbxEmployees.queryOptions()),
            queryClient.fetchQuery(orpc.settings.listPbxNumbers.queryOptions()),
          ]);

          const employees = (employeesData ?? []) as Employee[];
          const numbers = (numbersData ?? []) as PhoneNumber[];

          // Check if data has changed (indicating sync completed)
          // Compare stable serialization of relevant fields to detect content changes
          // Sort by id to ensure order-independent comparison, include all relevant fields
          const currentEmployeesHash = JSON.stringify(
            employees
              .map((e) => ({
                id: e.id,
                displayName: e.displayName,
                extension: e.extension,
                isActive: e.isActive,
              }))
              .sort((a, b) => a.id.localeCompare(b.id)),
          );
          const initialEmployeesHash = JSON.stringify(
            initialEmployees
              .map((e) => ({
                id: e.id,
                displayName: e.displayName,
                extension: e.extension,
                isActive: e.isActive,
              }))
              .sort((a, b) => a.id.localeCompare(b.id)),
          );
          const currentNumbersHash = JSON.stringify(
            numbers
              .map((n) => ({
                id: n.id,
                phoneNumber: n.phoneNumber,
                extension: n.extension,
                label: n.label,
                lineType: n.lineType,
                isActive: n.isActive,
                employeeId: n.employee?.externalId ?? null,
              }))
              .sort((a, b) => a.id.localeCompare(b.id)),
          );
          const initialNumbersHash = JSON.stringify(
            initialNumbers
              .map((n) => ({
                id: n.id,
                phoneNumber: n.phoneNumber,
                extension: n.extension,
                label: n.label,
                lineType: n.lineType,
                isActive: n.isActive,
                employeeId: n.employee?.externalId ?? null,
              }))
              .sort((a, b) => a.id.localeCompare(b.id)),
          );
          const hasChanges =
            employees.length !== initialEmployeeCount ||
            numbers.length !== initialNumberCount ||
            currentEmployeesHash !== initialEmployeesHash ||
            currentNumbersHash !== initialNumbersHash;

          if (hasChanges) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

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
      timeoutRef.current = setTimeout(
        () => {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          toast.error(
            "Синхронизация не завершилась в течение 5 минут. Пожалуйста, попробуйте снова.",
          );
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
    if (importPbxDirectoryMutation.isPending) {
      return;
    }

    if (selectedEmployees.size === 0 && selectedNumbers.size === 0) {
      toast.error("Выберите хотя бы одного сотрудника или номер для импорта");
      return;
    }

    try {
      const idempotencyKey = `import-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const result = await importPbxDirectoryMutation.mutateAsync({
        employeeIds: Array.from(selectedEmployees),
        numberIds: Array.from(selectedNumbers),
        idempotencyKey,
      });

      toast.success(
        `Импортировано ${result.importedEmployees} сотрудников и ${result.importedNumbers} номеров`,
      );
      router.push("/");
    } catch {
      toast.error("Ошибка при импорте. Попробуйте снова.");
    }
  }, [selectedEmployees, selectedNumbers, importPbxDirectoryMutation, router]);

  const hasData = employees.length > 0 || numbers.length > 0;

  return {
    // Webhook
    webhookUrl,
    webhookSecret,
    webhookSecretLoading,

    // API Config
    baseUrl,
    setBaseUrl,
    apiKey,
    setApiKey,
    baseUrlError,
    setBaseUrlError,
    apiKeyError,
    setApiKeyError,
    configSaved,
    setConfigSaved,
    baseUrlInputRef,
    apiKeyInputRef,

    // Data
    employees,
    numbers,
    hasData,

    // Selection
    selectedEmployees,
    selectedNumbers,
    handleToggleEmployee,
    handleToggleNumber,
    handleSelectAllEmployees,
    handleSelectAllNumbers,
    handleSelectAllFilteredEmployees,
    handleSelectAllFilteredNumbers,

    // Search & Pagination
    employeeSearch,
    setEmployeeSearch,
    numberSearch,
    setNumberSearch,
    employeePage,
    setEmployeePage,
    numberPage,
    setNumberPage,
    filteredEmployees,
    filteredNumbers,
    paginatedEmployees,
    paginatedNumbers,
    totalEmployeePages,
    totalNumberPages,
    allEmployeesSelected,
    allNumbersSelected,
    handleClearEmployeeSearch,
    handleClearNumberSearch,

    // Mutations status
    testAndSaveMutationPending: testAndSaveMutation.isPending,
    syncMutationPending: syncMutation.isPending,
    importMutationPending: importPbxDirectoryMutation.isPending,

    // Handlers
    handleCopy,
    handleTestAndSave,
    handleSync,
    handleImport,
  };
}
