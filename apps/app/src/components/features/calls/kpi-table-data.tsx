import {
  Badge,
  Button,
  DataGrid,
  DataGridColumnHeader,
  DataGridColumnVisibility,
  DataGridContainer,
  DataGridPagination,
  DataGridTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Skeleton,
} from "@calls/ui";
import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import {
  Check,
  Download,
  Loader2,
  Phone,
  Settings2,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";

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

const KPI_FIELD_LIMITS = {
  baseSalary: 999999,
  targetBonus: 999999,
  targetTalkTimeMinutes: 9999,
} as const;

const formatCurrency = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatMinutes = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  const hours = Math.floor(value / 60);
  const minutes = Math.floor(value % 60);
  if (hours === 0) return `${minutes}м`;
  return `${hours}ч ${minutes}м`;
};

const formatPercentage = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
};

const formatScore = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(1);
};

function KpiEditDialog({
  row,
  draft,
  isOpen,
  isLoading,
  onSave,
  onCancel,
  onFieldChange,
}: {
  row: KpiRow;
  draft: Partial<KpiRow>;
  isOpen: boolean;
  isLoading: boolean;
  onSave: () => void;
  onCancel: () => void;
  onFieldChange: (field: keyof KpiRow, value: string) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактирование KPI</DialogTitle>
          <DialogDescription>Настройте KPI для {row.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="baseSalary" className="text-right">
              Базовая зарплата
            </Label>
            <Input
              id="baseSalary"
              type="number"
              value={draft.baseSalary ?? ""}
              onChange={(e) => onFieldChange("baseSalary", e.target.value)}
              className="col-span-3"
              placeholder="0"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="targetBonus" className="text-right">
              Целевой бонус
            </Label>
            <Input
              id="targetBonus"
              type="number"
              value={draft.targetBonus ?? ""}
              onChange={(e) => onFieldChange("targetBonus", e.target.value)}
              className="col-span-3"
              placeholder="0"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="targetTalkTimeMinutes" className="text-right">
              Целевое время разговора
            </Label>
            <Input
              id="targetTalkTimeMinutes"
              type="number"
              value={draft.targetTalkTimeMinutes ?? ""}
              onChange={(e) =>
                onFieldChange("targetTalkTimeMinutes", e.target.value)
              }
              className="col-span-3"
              placeholder="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button type="button" onClick={onSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function KpiTableData({
  rows,
  isLoading,
  editingEmployeeId,
  savingEmployeeId,
  draftsByEmployeeId,
  onEditEmployee,
  onSaveRow,
  onCancelEdit,
  onDraftFieldChange,
  onExportCsv,
}: KpiTableDataProps) {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const columns = useMemo<ColumnDef<KpiRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Сотрудник",
        cell: ({ row }) => {
          const employee = row.original;
          return (
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="font-medium">{employee.name}</span>
                {employee.internalNumber && (
                  <span className="text-sm text-gray-500">
                    Внутр. номер: {employee.internalNumber}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "baseSalary",
        header: "Базовая зарплата",
        cell: ({ row }) => {
          const employee = row.original;
          const draft = draftsByEmployeeId[employee.employeeExternalId];
          const isEditing = editingEmployeeId === employee.employeeExternalId;
          const isSaving = savingEmployeeId === employee.employeeExternalId;

          if (isEditing) {
            return (
              <Input
                type="number"
                value={draft?.baseSalary ?? employee.baseSalary}
                onChange={(e) =>
                  onDraftFieldChange(
                    employee.employeeExternalId,
                    "baseSalary",
                    e.target.value,
                  )
                }
                placeholder="0"
                disabled={isSaving}
              />
            );
          }

          return (
            <div className="flex items-center gap-2">
              <span>{formatCurrency(employee.baseSalary)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onEditEmployee(employee.employeeExternalId)}
                disabled={isSaving}
                aria-label={`Редактировать KPI для ${employee.name}`}
              >
                <Settings2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          );
        },
      },
      {
        accessorKey: "targetBonus",
        header: "Целевой бонус",
        cell: ({ row }) => {
          const employee = row.original;
          const draft = draftsByEmployeeId[employee.employeeExternalId];
          const isEditing = editingEmployeeId === employee.employeeExternalId;
          const isSaving = savingEmployeeId === employee.employeeExternalId;

          if (isEditing) {
            return (
              <Input
                type="number"
                value={draft?.targetBonus ?? employee.targetBonus}
                onChange={(e) =>
                  onDraftFieldChange(
                    employee.employeeExternalId,
                    "targetBonus",
                    e.target.value,
                  )
                }
                placeholder="0"
                disabled={isSaving}
              />
            );
          }

          return <span>{formatCurrency(employee.targetBonus)}</span>;
        },
      },
      {
        accessorKey: "targetTalkTimeMinutes",
        header: "Целевое время",
        cell: ({ row }) => {
          const employee = row.original;
          const draft = draftsByEmployeeId[employee.employeeExternalId];
          const isEditing = editingEmployeeId === employee.employeeExternalId;
          const isSaving = savingEmployeeId === employee.employeeExternalId;

          if (isEditing) {
            return (
              <Input
                type="number"
                value={
                  draft?.targetTalkTimeMinutes ?? employee.targetTalkTimeMinutes
                }
                onChange={(e) =>
                  onDraftFieldChange(
                    employee.employeeExternalId,
                    "targetTalkTimeMinutes",
                    e.target.value,
                  )
                }
                placeholder="0"
                disabled={isSaving}
              />
            );
          }

          return <span>{formatMinutes(employee.targetTalkTimeMinutes)}</span>;
        },
      },
      {
        accessorKey: "totalCalls",
        header: "Всего звонков",
        cell: ({ row }) => {
          const value = row.original.totalCalls;
          return value != null && Number.isFinite(value)
            ? value.toString()
            : "—";
        },
      },
      {
        accessorKey: "totalTalkTimeMinutes",
        header: "Время разговора",
        cell: ({ row }) => formatMinutes(row.original.totalTalkTimeMinutes),
      },
      {
        accessorKey: "averageValueScore",
        header: "Средняя оценка",
        cell: ({ row }) => {
          const value = row.original.averageValueScore;
          if (value == null || !Number.isFinite(value)) return "—";

          let variant: "default" | "secondary" | "destructive" | "outline" =
            "default";
          if (value >= 4.5) variant = "default";
          else if (value >= 3.5) variant = "secondary";
          else if (value >= 2.5) variant = "outline";
          else variant = "destructive";

          return <Badge variant={variant}>{formatScore(value)}</Badge>;
        },
      },
      {
        accessorKey: "conversionRate",
        header: "Конверсия",
        cell: ({ row }) => formatPercentage(row.original.conversionRate),
      },
      {
        accessorKey: "totalRevenue",
        header: "Выручка",
        cell: ({ row }) => formatCurrency(row.original.totalRevenue),
      },
      {
        accessorKey: "calculatedSalary",
        header: "Начислено зарплата",
        cell: ({ row }) => formatCurrency(row.original.calculatedSalary),
      },
      {
        accessorKey: "calculatedBonus",
        header: "Начислено бонус",
        cell: ({ row }) => formatCurrency(row.original.calculatedBonus),
      },
      {
        accessorKey: "calculatedTotal",
        header: "Итого начислено",
        cell: ({ row }) => {
          const value = row.original.calculatedTotal;
          return (
            <span className="font-semibold text-green-600">
              {formatCurrency(value)}
            </span>
          );
        },
      },
    ],
    [
      editingEmployeeId,
      savingEmployeeId,
      draftsByEmployeeId,
      onEditEmployee,
      onDraftFieldChange,
    ],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  const editingRow = editingEmployeeId
    ? rows.find((row) => row.employeeExternalId === editingEmployeeId)
    : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-lg">
          <div className="grid grid-cols-12 gap-4 p-4 border-b">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-4" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 p-4 border-b">
              {Array.from({ length: 12 }).map((_, j) => (
                <Skeleton key={j} className="h-4" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">KPI по сотрудникам</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExportCsv}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Экспорт CSV
        </Button>
      </div>

      <DataGridContainer>
        <DataGrid>
          <DataGridTable>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <DataGridColumnHeader key={header.id} header={header} />
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </DataGridTable>
          <DataGridPagination table={table} />
        </DataGrid>
        <DataGridColumnVisibility table={table} />
      </DataGridContainer>

      {editingRow && (
        <KpiEditDialog
          row={editingRow}
          draft={draftsByEmployeeId[editingRow.employeeExternalId] || {}}
          isOpen={!!editingEmployeeId}
          isLoading={savingEmployeeId === editingRow.employeeExternalId}
          onSave={() => onSaveRow(editingRow)}
          onCancel={onCancelEdit}
          onFieldChange={(field, value) =>
            onDraftFieldChange(editingRow.employeeExternalId, field, value)
          }
        />
      )}
    </div>
  );
}
