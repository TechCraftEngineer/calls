"use client";

import { Separator } from "@calls/ui";
import Header from "@/components/layout/header";
import {
  ApiConfigCard,
  EmployeeList,
  ImportButton,
  NumberList,
  SyncCard,
  usePbxSetup,
  WebhookConfigCard,
} from "./_components";

export default function PbxSetupPage() {
  const {
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
    setEmployeePage,
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

    // Mutations
    testAndSaveMutationPending,
    syncMutationPending,

    // Handlers
    handleCopy,
    handleTestAndSave,
    handleSync,
    handleImport,
  } = usePbxSetup();

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

          <WebhookConfigCard
            webhookUrl={webhookUrl}
            webhookSecret={webhookSecret}
            webhookSecretLoading={webhookSecretLoading}
            onCopy={handleCopy}
          />

          <ApiConfigCard
            baseUrl={baseUrl}
            setBaseUrl={setBaseUrl}
            apiKey={apiKey}
            setApiKey={setApiKey}
            baseUrlError={baseUrlError}
            setBaseUrlError={setBaseUrlError}
            apiKeyError={apiKeyError}
            setApiKeyError={setApiKeyError}
            configSaved={configSaved}
            setConfigSaved={setConfigSaved}
            testAndSaveMutationPending={testAndSaveMutationPending}
            onTestAndSave={handleTestAndSave}
          />

          {configSaved && (
            <SyncCard syncMutationPending={syncMutationPending} onSync={handleSync} />
          )}

          {hasData && (
            <>
              <Separator className="my-6" />

              <EmployeeList
                employees={employees}
                selectedEmployees={selectedEmployees}
                filteredEmployees={filteredEmployees}
                paginatedEmployees={paginatedEmployees}
                employeeSearch={employeeSearch}
                setEmployeeSearch={setEmployeeSearch}
                setEmployeePage={setEmployeePage}
                employeePage={0}
                totalEmployeePages={totalEmployeePages}
                allEmployeesSelected={allEmployeesSelected}
                onToggleEmployee={handleToggleEmployee}
                onSelectAllEmployees={handleSelectAllEmployees}
                onSelectAllFilteredEmployees={handleSelectAllFilteredEmployees}
                onClearSearch={handleClearEmployeeSearch}
              />

              <NumberList
                numbers={numbers}
                selectedNumbers={selectedNumbers}
                filteredNumbers={filteredNumbers}
                paginatedNumbers={paginatedNumbers}
                numberSearch={numberSearch}
                setNumberSearch={setNumberSearch}
                setNumberPage={setNumberPage}
                numberPage={0}
                totalNumberPages={totalNumberPages}
                allNumbersSelected={allNumbersSelected}
                onToggleNumber={handleToggleNumber}
                onSelectAllNumbers={handleSelectAllNumbers}
                onSelectAllFilteredNumbers={handleSelectAllFilteredNumbers}
                onClearSearch={handleClearNumberSearch}
              />

              <ImportButton
                selectedEmployeesCount={selectedEmployees.size}
                selectedNumbersCount={selectedNumbers.size}
                disabled={selectedEmployees.size === 0 && selectedNumbers.size === 0}
                onImport={handleImport}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
}
