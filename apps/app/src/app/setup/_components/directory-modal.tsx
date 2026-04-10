"use client";

import {
  Button,
  DataGrid,
  DataGridContainer,
  DataGridTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  toast,
} from "@calls/ui";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { getEmployeeColumns } from "@/components/features/settings/megapbx/employee-columns";
import type { PbxEmployeeItem } from "@/components/features/settings/types";
import { SearchInput } from "@/components/ui/search-input";
import { useORPC } from "@/orpc/react";
import type { ModalProps } from "./types";

export function DirectoryModal({ open, onOpenChange, onComplete }: ModalProps) {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  // TODO: reserved for future excluded numbers filter
  const [_excludedNumbers, _setExcludedNumbers] = useState<Set<string>>(new Set());
  const [employeeSearch, setEmployeeSearch] = useState("");

  const { data: employees = [], isLoading: empLoading } = useQuery({
    ...orpc.settings.listPbxEmployees.queryOptions(),
    enabled: open,
  });
  // TODO: numbers query placeholder for PBX numbers list
  const { data: _numbers = [], isLoading: _numLoading } = useQuery({
    ...orpc.settings.listPbxNumbers.queryOptions(),
    enabled: open,
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      await orpc.settings.syncPbxDirectory.mutate();
      toast.success("Синхронизировано");
      await queryClient.invalidateQueries({ queryKey: orpc.settings.listPbxEmployees.queryKey() });
      await queryClient.invalidateQueries({ queryKey: orpc.settings.listPbxNumbers.queryKey() });
    } catch (_err) {
      toast.error("Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
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
    initialState: { pagination: { pageIndex: 0, pageSize: 5 } },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Сотрудники и номера</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Синхронизировать
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <h4 className="font-medium">Сотрудники ({filteredEmployees.length})</h4>
            <SearchInput
              value={employeeSearch}
              onChange={setEmployeeSearch}
              placeholder="Поиск..."
              className="w-48"
            />
          </div>

          <DataGrid
            table={employeeTable}
            recordCount={filteredEmployees.length}
            isLoading={empLoading}
            emptyMessage="Нет данных. Синхронизируйте справочник."
            tableLayout={{ rowBorder: false, headerBorder: false, headerBackground: true }}
          >
            <DataGridContainer className="border rounded-lg">
              <div className="overflow-x-auto max-h-48">
                <DataGridTable<PbxEmployeeItem> />
              </div>
            </DataGridContainer>
          </DataGrid>
        </div>
        <Button onClick={onComplete} className="w-full">
          Утвердить справочник
        </Button>
      </DialogContent>
    </Dialog>
  );
}
