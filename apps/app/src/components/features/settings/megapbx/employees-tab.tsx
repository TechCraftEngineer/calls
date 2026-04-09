"use client";

import { Badge, DataGrid, DataGridContainer, DataGridPagination, DataGridTable } from "@calls/ui";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { SearchInput } from "@/components/ui/search-input";
import type { PbxEmployeeItem } from "../types";
import { getEmployeeColumns } from "./employee-columns";

interface EmployeesTabProps {
  employees: PbxEmployeeItem[];
  employeesLoading: boolean;
  employeeSearch: string;
  onEmployeeSearchChange: (value: string) => void;
}

export function EmployeesTab({
  employees,
  employeesLoading,
  employeeSearch,
  onEmployeeSearchChange,
}: EmployeesTabProps) {
  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query) return employees;

    return employees.filter((employee) =>
      [employee.displayName, employee.email, employee.extension]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [employeeSearch, employees]);

  const employeeColumns = useMemo(() => getEmployeeColumns(), []);

  const employeeTable = useReactTable({
    data: filteredEmployees,
    columns: employeeColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      sorting: [{ id: "displayName", desc: false }],
      pagination: { pageIndex: 0, pageSize: 20 },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 className="font-semibold">Сотрудники АТС</h4>
          <p className="text-sm text-muted-foreground">
            Список сотрудников, синхронизированных из АТС. Сотрудники автоматически привязаны к
            номерам.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <Badge variant="outline">{filteredEmployees.length} записей</Badge>
          <SearchInput
            value={employeeSearch}
            onChange={onEmployeeSearchChange}
            placeholder="Поиск по сотруднику, email, внутреннему номеру…"
            className="w-full sm:w-96"
          />
        </div>
      </div>
      <DataGrid
        table={employeeTable}
        recordCount={filteredEmployees.length}
        isLoading={employeesLoading}
        emptyMessage={
          employees.length === 0
            ? "Сотрудники пока не синхронизированы. Сначала запустите синхронизацию справочника."
            : "По текущему запросу сотрудники не найдены."
        }
        tableLayout={{
          rowBorder: false,
          headerBorder: false,
          headerBackground: true,
        }}
        tableClassNames={{ base: "op-table" }}
      >
        <DataGridContainer className="border-0">
          <div className="overflow-x-auto">
            <DataGridTable<PbxEmployeeItem> />
          </div>
          <div className="px-4 py-3">
            <DataGridPagination
              sizes={[20, 50, 100]}
              sizesLabel="Строк на странице"
              info="{from} - {to} из {count}"
              rowsPerPageLabel="Строк на странице"
              previousPageLabel="Предыдущая страница"
              nextPageLabel="Следующая страница"
            />
          </div>
        </DataGridContainer>
      </DataGrid>
    </div>
  );
}
