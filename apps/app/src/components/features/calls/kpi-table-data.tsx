import {
  Button,
  DataGrid,
  DataGridColumnVisibility,
  DataGridContainer,
  DataGridPagination,
  DataGridTable,
  Skeleton,
} from "@calls/ui";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Download } from "lucide-react";
import { useMemo } from "react";

import { createKpiTableColumns } from "./kpi-table-columns";
import KpiEditDialog from "./kpi-edit-dialog";
import type { KpiTableDataProps, KpiRow } from "./kpi-table-types";

export default function KpiTableData({
  rows,
  isLoading,
  editingEmployeeId,
  savingEmployeeId,
  isApplyingBulkKpi = false,
  draftsByEmployeeId,
  onEditEmployee,
  onSaveRow,
  onCancelEdit,
  onDraftFieldChange,
  onExportCsv,
}: KpiTableDataProps) {
  const columns = useMemo(
    () =>
      createKpiTableColumns(
        onEditEmployee,
        savingEmployeeId,
        isApplyingBulkKpi,
      ),
    [onEditEmployee, savingEmployeeId, isApplyingBulkKpi],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      sorting: [{ id: "employee", desc: false }],
      pagination: { pageSize: 10, pageIndex: 0 },
      columnPinning: { left: ["employee"] },
    },
  });

  const editingRow = editingEmployeeId
    ? rows.find((row) => row.employeeExternalId === editingEmployeeId)
    : null;

  if (isLoading) {
    return <KpiTableDataSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">KPI сотрудников</h3>
          <p className="text-sm text-muted-foreground">
            Всего сотрудников: {rows.length}
          </p>
        </div>
        <Button
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
        <DataGrid
          table={table}
          recordCount={rows.length}
          isLoading={isLoading}
          emptyMessage="Нет данных для отображения"
        >
          <DataGridTable />
          <DataGridPagination />
        </DataGrid>
        <DataGridColumnVisibility
          table={table}
          trigger={
            <Button variant="outline" size="sm">
              Настройки колонок
            </Button>
          }
        />
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

function KpiTableDataSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="border rounded-lg">
        <div className="p-4">
          <Skeleton className="h-8 w-full mb-4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
