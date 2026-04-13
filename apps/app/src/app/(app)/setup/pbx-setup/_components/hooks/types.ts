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
