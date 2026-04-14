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
          predicate: (query) => query.queryKey[0] === "workspaces.getSetupProgress",
        });
      },
    }),
  );

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
      onSuccess: async (result) => {
        toast.success(result.message);
        await queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxEmployees.queryKey({}),
        });
        await queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxNumbers.queryKey({}),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Ошибка синхронизации");
      },
    }),
  );

  const importPbxDirectoryMutation = useMutation(
    orpc.settings.importPbxDirectory.mutationOptions({
      onSuccess: async (result) => {
        toast.success(
          `Импортировано ${result.importedEmployees} сотрудников и ${result.importedNumbers} номеров`,
        );
        // Очищаем выбор после успешного импорта
        setSelectedEmployees(new Set());
        setSelectedNumbers(new Set());
        await queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxEmployees.queryKey({}),
        });
        await queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxNumbers.queryKey({}),
        });

        // Автоматически отмечаем шаг directory как выполненный после импорта
        if (activeWorkspace) {
          try {
            await updateSetupProgressMutation.mutateAsync({
              workspaceId: activeWorkspace.id,
              completedStep: "directory",
            });
          } catch (error) {
            console.error("Не удалось сохранить прогресс настройки:", error);
          }
        }
      },
      onError: () => {
        toast.error("Ошибка импорта");
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

  const handleNext = async () => {
    // Импортируем выбранные элементы, если они есть
    if (selectedEmployees.size > 0 || selectedNumbers.size > 0) {
      try {
        await importPbxDirectoryMutation.mutateAsync({
          employeeIds: Array.from(selectedEmployees),
          numberIds: Array.from(selectedNumbers),
        });
      } catch {
        return;
      }
    }

    // Сохраняем в базу данных что шаг завершен
    if (activeWorkspace) {
      try {
        await updateSetupProgressMutation.mutateAsync({
          workspaceId: activeWorkspace.id,
          completedStep: "directory",
        });
      } catch (error) {
        console.error("Не удалось сохранить прогресс настройки:", error);
        toast.error("Не удалось сохранить прогресс. Попробуйте снова.");
      }
    }

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
            onClick={() => router.push(paths.setup.pbxSetup)}
            aria-label="Назад"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Импорт справочника</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Синхронизируйте данные с PBX и отметьте сотрудников и номера для импорта
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : employees.length === 0 && numbers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <RefreshCw className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">Справочник пуст</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Нажмите кнопку "Синхронизировать" чтобы загрузить данные из PBX
          </p>
          <Button onClick={handleSync} disabled={syncPbxDirectoryMutation.isPending}>
            {syncPbxDirectoryMutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Синхронизировать
          </Button>
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
      <div className="flex justify-between gap-3">
        <Button variant="outline" onClick={() => router.push(paths.setup.pbxSetup)}>
          <ArrowLeft className="mr-2 size-4" />
          Назад
        </Button>
        <Button
          onClick={handleNext}
          disabled={
            isLoading ||
            importPbxDirectoryMutation.isPending ||
            updateSetupProgressMutation.isPending
          }
        >
          {importPbxDirectoryMutation.isPending || updateSetupProgressMutation.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : null}
          {selectedEmployees.size > 0 || selectedNumbers.size > 0
            ? `Импортировать и продолжить (${selectedEmployees.size + selectedNumbers.size})`
            : "Пропустить"}
        </Button>
      </div>
    </div>
  );
}
