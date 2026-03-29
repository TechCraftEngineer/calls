export interface KpiRow {
  employeeExternalId: string;
  name: string;
  internalNumber?: string | null;
  baseSalary: number;
  targetBonus: number;
  targetTalkTimeMinutes: number;
  totalCalls?: number | null;
  totalTalkTimeMinutes?: number | null;
  averageValueScore?: number | null;
  completedCallsCount?: number | null;
  conversionRate?: number | null;
  totalRevenue?: number | null;
  calculatedSalary?: number | null;
  calculatedBonus?: number | null;
  calculatedTotal?: number | null;
}

export interface KpiTableDataProps {
  rows: KpiRow[];
  isLoading: boolean;
  editingEmployeeId: string | null;
  savingEmployeeId: string | null;
  draftsByEmployeeId: Record<string, Partial<KpiRow>>;
  onEditEmployee: (employeeId: string) => void;
  onSaveRow: (row: KpiRow) => void;
  onCancelEdit: () => void;
  onDraftFieldChange: (
    employeeId: string,
    field: keyof KpiRow,
    value: string,
  ) => void;
  onExportCsv: () => void;
}

export const KPI_FIELD_LIMITS = {
  baseSalary: 999999,
  targetBonus: 999999,
  targetTalkTimeMinutes: 9999,
} as const;
