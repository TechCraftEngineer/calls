"use client";

import { paths } from "@calls/config";
import { toast } from "@calls/ui";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useApiConfig } from "./use-api-config";
import { useDirectoryData } from "./use-directory-data";
import { usePbxMutations } from "./use-pbx-mutations";
import { useSelection } from "./use-selection";
import { useWebhookConfig } from "./use-webhook-config";

export type { UsePbxSetupReturn } from "./types";

export function usePbxSetup() {
  const router = useRouter();

  // Webhook config
  const { webhookUrl, webhookSecret, webhookSecretLoading } = useWebhookConfig();

  // API config form
  const {
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
    validateConfig,
    focusFirstError,
  } = useApiConfig();

  // Selection state
  const {
    selectedEmployees,
    selectedNumbers,
    handleToggleEmployee,
    handleToggleNumber,
    handleSelectAllEmployees,
    handleSelectAllNumbers,
    handleSelectAllFilteredEmployees,
    handleSelectAllFilteredNumbers,
  } = useSelection();

  // Directory data with filtering and pagination
  const {
    employees,
    numbers,
    hasData,
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
    resetPagination,
  } = useDirectoryData(selectedEmployees, selectedNumbers);

  // Mutations
  const {
    testAndSaveMutationPending,
    syncMutationPending,
    importMutationPending,
    handleTestAndSave: baseHandleTestAndSave,
    handleSync,
    handleImport: baseHandleImport,
  } = usePbxMutations(validateConfig, focusFirstError, resetPagination);

  // Handlers with dependencies
  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} скопирован в буфер обмена`);
  }, []);

  const handleTestAndSave = useCallback(() => {
    baseHandleTestAndSave(baseUrl, apiKey, webhookSecret);
    setConfigSaved(true);
  }, [baseHandleTestAndSave, baseUrl, apiKey, webhookSecret, setConfigSaved]);

  const handleClearEmployeeSearch = useCallback(() => {
    setEmployeeSearch("");
    setEmployeePage(0);
  }, [setEmployeeSearch, setEmployeePage]);

  const handleClearNumberSearch = useCallback(() => {
    setNumberSearch("");
    setNumberPage(0);
  }, [setNumberSearch, setNumberPage]);

  const handleImport = useCallback(async () => {
    await baseHandleImport(selectedEmployees, selectedNumbers, () => {
      router.push(paths.setup.root);
    });
  }, [baseHandleImport, selectedEmployees, selectedNumbers, router]);

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
    handleSelectAllEmployees: () =>
      handleSelectAllEmployees(paginatedEmployees, allEmployeesSelected),
    handleSelectAllNumbers: () => handleSelectAllNumbers(paginatedNumbers, allNumbersSelected),
    handleSelectAllFilteredEmployees: () => handleSelectAllFilteredEmployees(filteredEmployees),
    handleSelectAllFilteredNumbers: () => handleSelectAllFilteredNumbers(filteredNumbers),

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
    testAndSaveMutationPending,
    syncMutationPending,
    importMutationPending,

    // Handlers
    handleCopy,
    handleTestAndSave,
    handleSync,
    handleImport,
  };
}
