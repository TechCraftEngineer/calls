"use client";

import { paths } from "@calls/config";
import { Button, toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ITEMS_PER_PAGE } from "@/app/(app)/setup/pbx-setup/_components/constants";
import type { Employee, PhoneNumber } from "@/app/(app)/setup/pbx-setup/_components/types";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { EmployeeList } from "@/components/pbx-setup/employee-list";
import { NumberList } from "@/components/pbx-setup/number-list";
import { useORPC } from "@/orpc/react";

export default function DirectoryPage() {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();

  const updateSetupProgressMutation = useMutation(
    orpc.workspaces.updateSetupProgress.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.workspaces.list.queryKey(),
        });
      },
    }),
  );

  const { data: setupProgressData } = useQuery({
    ...orpc.workspaces.getSetupProgress.queryOptions({
      input: {
        workspaceId: activeWorkspace?.id ?? "",
      },
    }),
    enabled: !!activeWorkspace,
  });

  // Selection state
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());

  // Search state
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [numberSearch, setNumberSearch] = useState("");

  // Pagination state
  const [employeePage, setEmployeePage] = useState(0);
  const [numberPage, setNumberPage] = useState(0);

  const { data: employees = [], isLoading: empLoading } = useQuery({
    ...orpc.settings.listPbxEmployees.queryOptions(),
  });

  const { data: numbers = [], isLoading: numLoading } = useQuery({
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

  // Filter employees
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees;
    const q = employeeSearch.toLowerCase();
    return employees.filter((e: Employee) =>
      [e.displayName, e.email, e.extension].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [employees, employeeSearch]);

  // Filter numbers
  const filteredNumbers = useMemo(() => {
    if (!numberSearch) return numbers;
    const q = numberSearch.toLowerCase();
    return numbers.filter((n: PhoneNumber) =>
      [n.phoneNumber, n.label, n.employee?.displayName].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [numbers, numberSearch]);

  // Paginate employees
  const paginatedEmployees = useMemo(() => {
    const start = employeePage * ITEMS_PER_PAGE;
    return filteredEmployees.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEmployees, employeePage]);

  // Paginate numbers
  const paginatedNumbers = useMemo(() => {
    const start = numberPage * ITEMS_PER_PAGE;
    return filteredNumbers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredNumbers, numberPage]);

  const totalEmployeePages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const totalNumberPages = Math.ceil(filteredNumbers.length / ITEMS_PER_PAGE);

  // Check if all on current page are selected
  const allEmployeesSelected = useMemo(
    () =>
      paginatedEmployees.length > 0 && paginatedEmployees.every((e) => selectedEmployees.has(e.id)),
    [paginatedEmployees, selectedEmployees],
  );

  const allNumbersSelected = useMemo(
    () => paginatedNumbers.length > 0 && paginatedNumbers.every((n) => selectedNumbers.has(n.id)),
    [paginatedNumbers, selectedNumbers],
  );

  // Handlers
  const handleToggleEmployee = useCallback((id: string) => {
    setSelectedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleNumber = useCallback((id: string) => {
    setSelectedNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAllEmployees = useCallback(() => {
    if (allEmployeesSelected) {
      setSelectedEmployees((prev) => {
        const next = new Set(prev);
        paginatedEmployees.forEach((e) => {
          next.delete(e.id);
        });
        return next;
      });
    } else {
      setSelectedEmployees((prev) => {
        const next = new Set(prev);
        paginatedEmployees.forEach((e) => {
          next.add(e.id);
        });
        return next;
      });
    }
  }, [allEmployeesSelected, paginatedEmployees]);

  const handleSelectAllNumbers = useCallback(() => {
    if (allNumbersSelected) {
      setSelectedNumbers((prev) => {
        const next = new Set(prev);
        paginatedNumbers.forEach((n) => {
          next.delete(n.id);
        });
        return next;
      });
    } else {
      setSelectedNumbers((prev) => {
        const next = new Set(prev);
        paginatedNumbers.forEach((n) => {
          next.add(n.id);
        });
        return next;
      });
    }
  }, [allNumbersSelected, paginatedNumbers]);

  const handleSelectAllFilteredEmployees = useCallback(() => {
    setSelectedEmployees((prev) => {
      const next = new Set(prev);
      filteredEmployees.forEach((e) => {
        next.add(e.id);
      });
      return next;
    });
  }, [filteredEmployees]);

  const handleSelectAllFilteredNumbers = useCallback(() => {
    setSelectedNumbers((prev) => {
      const next = new Set(prev);
      filteredNumbers.forEach((n) => {
        next.add(n.id);
      });
      return next;
    });
  }, [filteredNumbers]);

  const handleClearEmployeeSearch = useCallback(() => {
    setEmployeeSearch("");
    setEmployeePage(0);
  }, []);

  const handleClearNumberSearch = useCallback(() => {
    setNumberSearch("");
    setNumberPage(0);
  }, []);

  const handleSync = async () => {
    await syncPbxDirectoryMutation.mutateAsync({});
  };

  const handleComplete = async () => {
    // Сохраняем в базу данных что шаг завершен
    if (activeWorkspace && setupProgressData) {
      try {
        const completed = new Set(setupProgressData.completedSteps ?? []);
        completed.add("directory");
        await updateSetupProgressMutation.mutateAsync({
          workspaceId: activeWorkspace.id,
          completedSteps: [...completed],
        });
      } catch (error) {
        console.error("Failed to update setup progress:", error);
      }
    }

    toast.success("Справочник утвержден");
    router.push(paths.setup.root);
  };

  const isLoading = empLoading || numLoading;

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
              Выберите сотрудников и номера для включения в справочник
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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Employees List */}
          <EmployeeList
            employees={employees}
            selectedEmployees={selectedEmployees}
            filteredEmployees={filteredEmployees}
            paginatedEmployees={paginatedEmployees}
            employeeSearch={employeeSearch}
            setEmployeeSearch={setEmployeeSearch}
            setEmployeePage={setEmployeePage}
            employeePage={employeePage}
            totalEmployeePages={totalEmployeePages}
            allEmployeesSelected={allEmployeesSelected}
            onToggleEmployee={handleToggleEmployee}
            onSelectAllEmployees={handleSelectAllEmployees}
            onSelectAllFilteredEmployees={handleSelectAllFilteredEmployees}
            onClearSearch={handleClearEmployeeSearch}
          />

          {/* Numbers List */}
          <NumberList
            numbers={numbers}
            selectedNumbers={selectedNumbers}
            filteredNumbers={filteredNumbers}
            paginatedNumbers={paginatedNumbers}
            numberSearch={numberSearch}
            setNumberSearch={setNumberSearch}
            setNumberPage={setNumberPage}
            numberPage={numberPage}
            totalNumberPages={totalNumberPages}
            allNumbersSelected={allNumbersSelected}
            onToggleNumber={handleToggleNumber}
            onSelectAllNumbers={handleSelectAllNumbers}
            onSelectAllFilteredNumbers={handleSelectAllFilteredNumbers}
            onClearSearch={handleClearNumberSearch}
          />
        </>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push(paths.setup.root)}>
          Отмена
        </Button>
        <Button onClick={handleComplete} disabled={isLoading}>
          Утвердить справочник
        </Button>
      </div>
    </div>
  );
}
