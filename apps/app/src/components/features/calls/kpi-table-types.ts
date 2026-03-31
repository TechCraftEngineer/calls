export interface KpiRow {
  employeeExternalId: string;
  name: string;
  email: string;
  baseSalary: number;
  targetBonus: number;
  targetTalkTimeMinutes: number;
  periodTargetTalkTimeMinutes: number;
  actualTalkTimeMinutes: number;
  kpiCompletionPercentage: number;
  calculatedBonus: number;
  totalCalculatedSalary: number;
  totalCalls: number;
  incoming: number;
  outgoing: number;
  missed: number;
  internalNumber?: string | null;
}

export interface KpiTableDataProps {
  rows: KpiRow[];
  isLoading: boolean;
  editingEmployeeId: string | null;
  savingEmployeeId: string | null;
  isApplyingBulkKpi?: boolean;
  draftsByEmployeeId: Record<string, Partial<KpiRow>>;
  onEditEmployee: (employeeId: string) => void;
  onSaveRow: (row: KpiRow) => void;
  onCancelEdit: () => void;
  onDraftFieldChange: (employeeId: string, field: keyof KpiRow, value: string) => void;
  onExportCsv: () => void;
}

export const KPI_FIELD_LIMITS = {
  baseSalary: 999999,
  targetBonus: 999999,
  targetTalkTimeMinutes: 9999,
} as const;
