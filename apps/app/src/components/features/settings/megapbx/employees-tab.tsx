"use client";

import { Badge, DataGrid, DataGridContainer, DataGridPagination, DataGridTable } from "@calls/ui";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";
import { SearchInput } from "@/components/ui/search-input";
import type { PbxCandidateInvitation, PbxCandidateUser, PbxEmployeeItem } from "../types";
import { getEmployeeColumns } from "./employee-columns";
import { EmployeeLinkDialog } from "./employee-link-dialog";

interface EmployeesTabProps {
  employees: PbxEmployeeItem[];
  employeesLoading: boolean;
  employeeSearch: string;
  onEmployeeSearchChange: (value: string) => void;
  employeeLinkOptions: Record<string, { users: PbxCandidateUser[]; invitations: PbxCandidateInvitation[] }>;
  onLink: (input: {
    targetType: "employee";
    targetExternalId: string;
    userId?: string | null;
    invitationId?: string | null;
  }) => Promise<void>;
  onUnlink: (input: { targetType: "employee"; targetExternalId: string }) => Promise<void>;
}

export function EmployeesTab({
  employees,
  employeesLoading,
  employeeSearch,
  onEmployeeSearchChange,
  employeeLinkOptions,
  onLink,
  onUnlink,
}: EmployeesTabProps) {
  const [linkingEmployeeIds, setLinkingEmployeeIds] = useState<Record<string, boolean>>({});
  const [unlinkingEmployeeIds, setUnlinkingEmployeeIds] = useState<Record<string, boolean>>({});

  // Состояние модального окна
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<PbxEmployeeItem | null>(null);

  // Открыть диалог привязки
  const handleOpenLinkDialog = useCallback((employee: PbxEmployeeItem) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  }, []);

  // Обработка привязки из диалога
  const handleLink = useCallback(
    async (input: { userId?: string | null; invitationId?: string | null }) => {
      if (!selectedEmployee) return;

      const id = selectedEmployee.externalId;
      setLinkingEmployeeIds((prev) => ({ ...prev, [id]: true }));
      try {
        await onLink({
          targetType: "employee",
          targetExternalId: id,
          userId: input.userId,
          invitationId: input.invitationId,
        });
        setDialogOpen(false);
        setSelectedEmployee(null);
      } finally {
        setLinkingEmployeeIds((prev) => {
          const { [id]: _removed, ...rest } = prev;
          return rest;
        });
      }
    },
    [onLink, selectedEmployee],
  );

  const handleUnlink = useCallback(
    async (input: { targetType: "employee"; targetExternalId: string }) => {
      const id = input.targetExternalId;
      setUnlinkingEmployeeIds((prev) => ({ ...prev, [id]: true }));
      try {
        await onUnlink(input);
      } finally {
        setUnlinkingEmployeeIds((prev) => {
          const { [id]: _removed, ...rest } = prev;
          return rest;
        });
      }
    },
    [onUnlink],
  );

  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query) return employees;

    return employees.filter((employee) =>
      [
        employee.displayName,
        employee.email,
        employee.extension,
        employee.linkedUser?.email,
        employee.linkedUser?.name,
        employee.linkedInvitation?.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [employeeSearch, employees]);

  const employeeColumns = useMemo(
    () =>
      getEmployeeColumns(
        handleOpenLinkDialog,
        handleUnlink,
        linkingEmployeeIds,
        unlinkingEmployeeIds,
      ),
    [
      handleOpenLinkDialog,
      handleUnlink,
      linkingEmployeeIds,
      unlinkingEmployeeIds,
    ],
  );

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
          <h4 className="font-semibold">Привязка сотрудников</h4>
          <p className="text-sm text-muted-foreground">
            Сопоставьте сотрудников АТС с пользователями и приглашениями в компании.
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

      {/* Модальное окно привязки */}
      <EmployeeLinkDialog
        employee={selectedEmployee}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        options={
          selectedEmployee
            ? employeeLinkOptions[selectedEmployee.externalId] ?? { users: [], invitations: [] }
            : { users: [], invitations: [] }
        }
        onLink={handleLink}
        linking={selectedEmployee ? linkingEmployeeIds[selectedEmployee.externalId] : false}
      />
    </div>
  );
}
