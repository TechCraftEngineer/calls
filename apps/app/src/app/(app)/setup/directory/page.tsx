"use client";

import { paths } from "@calls/config";

import { Button, Card, DataGrid, DataGridContainer, DataGridTable, toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getEmployeeColumns } from "@/components/features/settings/megapbx/employee-columns";
import type { PbxEmployeeItem } from "@/components/features/settings/types/common";
import { SearchInput } from "@/components/ui/search-input";
import { useORPC } from "@/orpc/react";

export default function DirectoryPage() {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const [employeeSearch, setEmployeeSearch] = useState("");

  const { data: employees = [], isLoading: empLoading } = useQuery({
    ...orpc.settings.listPbxEmployees.queryOptions(),
  });

  const { data: _numbers = [], isLoading: _numLoading } = useQuery({
    ...orpc.settings.listPbxNumbers.queryOptions(),
  });

  const syncPbxDirectoryMutation = useMutation(
    orpc.settings.syncPbxDirectory.mutationOptions({
      onSuccess: async () => {
        toast.success("Синхронизировано");
        await queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxEmployees.queryKey(),
        });
        await queryClient.invalidateQueries({ queryKey: orpc.settings.listPbxNumbers.queryKey() });
      },
      onError: () => {
        toast.error("Ошибка синхронизации");
      },
    }),
  );

  const handleSync = async () => {
    await syncPbxDirectoryMutation.mutateAsync({});
  };

  const handleComplete = () => {
    // Сохраняем в sessionStorage что шаг завершен
    const saved = sessionStorage.getItem("setup_completed_steps");
    const completed = new Set(saved ? JSON.parse(saved) : []);
    completed.add("directory");
    sessionStorage.setItem("setup_completed_steps", JSON.stringify([...completed]));

    toast.success("Справочник утвержден");
    router.push(paths.setup.root);
  };

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter((e: PbxEmployeeItem) =>
      [e.displayName, e.email, e.extension].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [employees, employeeSearch]);

  const employeeColumns = useMemo(() => getEmployeeColumns(), []);
  const employeeTable = useReactTable({
    data: filteredEmployees,
    columns: employeeColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(paths.setup.root)}
            aria-label="Назад"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Сотрудники и номера</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Синхронизируйте справочник и отметьте номера для исключения
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleSync}
          disabled={syncPbxDirectoryMutation.isPending}
        >
          {syncPbxDirectoryMutation.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-4" />
          )}
          Синхронизировать
        </Button>
      </div>

      {/* Employees Card */}
      <Card className="overflow-hidden">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Сотрудники ({filteredEmployees.length})</h2>
            <SearchInput
              value={employeeSearch}
              onChange={setEmployeeSearch}
              placeholder="Поиск по имени, email или внутреннему..."
              className="w-64"
            />
          </div>
        </div>

        <div className="p-4">
          <DataGrid
            table={employeeTable}
            recordCount={filteredEmployees.length}
            isLoading={empLoading}
            emptyMessage="Нет данных. Синхронизируйте справочник."
            tableLayout={{ rowBorder: true, headerBorder: true, headerBackground: true }}
          >
            <DataGridContainer className="rounded-lg border">
              <div className="overflow-x-auto">
                <DataGridTable<PbxEmployeeItem> />
              </div>
            </DataGridContainer>
          </DataGrid>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push(paths.setup.root)}>
          Отмена
        </Button>
        <Button onClick={handleComplete}>Утвердить справочник</Button>
      </div>
    </div>
  );
}
