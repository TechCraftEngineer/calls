"use client";

import { Button, Card, Checkbox, Input } from "@calls/ui";
import { Search, Users, X } from "lucide-react";
import { ITEMS_PER_PAGE } from "@/app/(app)/setup/pbx-setup/_components/constants";
import type { Employee } from "@/app/(app)/setup/pbx-setup/_components/types";

interface EmployeeListProps {
  employees: Employee[];
  selectedEmployees: Set<string>;
  filteredEmployees: Employee[];
  paginatedEmployees: Employee[];
  employeeSearch: string;
  setEmployeeSearch: (value: string) => void;
  setEmployeePage: (value: number | ((prev: number) => number)) => void;
  employeePage: number;
  totalEmployeePages: number;
  allEmployeesSelected: boolean;
  onToggleEmployee: (id: string) => void;
  onSelectAllEmployees: () => void;
  onSelectAllFilteredEmployees: () => void;
  onClearSearch: () => void;
}

export function EmployeeList({
  employees,
  selectedEmployees,
  filteredEmployees,
  paginatedEmployees,
  employeeSearch,
  setEmployeeSearch,
  setEmployeePage,
  employeePage,
  totalEmployeePages,
  allEmployeesSelected,
  onToggleEmployee,
  onSelectAllEmployees,
  onSelectAllFilteredEmployees,
  onClearSearch,
}: EmployeeListProps) {
  return (
    <Card className="mb-6 p-6">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Users className="size-5 text-primary" />
          Сотрудники ({employees.length} всего, выбрано {selectedEmployees.size})
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск сотрудников..."
              value={employeeSearch}
              onChange={(e) => {
                setEmployeeSearch(e.target.value);
                setEmployeePage(0);
              }}
              className="pl-9 pr-9"
            />
            {employeeSearch && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 size-6 -translate-y-1/2"
                onClick={onClearSearch}
                aria-label="Очистить поиск сотрудников"
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {filteredEmployees.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Checkbox
            checked={allEmployeesSelected}
            onCheckedChange={onSelectAllEmployees}
            id="select-all-employees-page"
          />
          <label htmlFor="select-all-employees-page" className="text-sm">
            Выбрать всех на странице ({paginatedEmployees.length})
          </label>
          {filteredEmployees.length > ITEMS_PER_PAGE && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onSelectAllFilteredEmployees}
              className="text-xs"
            >
              Выбрать все найденные ({filteredEmployees.length})
            </Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {paginatedEmployees.map((employee) => (
          <label
            key={employee.id}
            htmlFor={`checkbox-employee-${employee.id}`}
            className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
          >
            <Checkbox
              id={`checkbox-employee-${employee.id}`}
              checked={selectedEmployees.has(employee.id)}
              onCheckedChange={() => onToggleEmployee(employee.id)}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{employee.displayName}</div>
              <div className="text-sm text-muted-foreground truncate">
                {employee.extension && `Внутр. номер: ${employee.extension}`}
                {employee.email && ` • ${employee.email}`}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Employee Pagination */}
      {totalEmployeePages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Страница {employeePage + 1} из {totalEmployeePages} ({filteredEmployees.length} всего)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmployeePage((p) => Math.max(0, p - 1))}
              disabled={employeePage === 0}
            >
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmployeePage((p) => Math.min(totalEmployeePages - 1, p + 1))}
              disabled={employeePage >= totalEmployeePages - 1}
            >
              Вперёд
            </Button>
          </div>
        </div>
      )}

      {filteredEmployees.length === 0 && employeeSearch && (
        <div className="py-8 text-center text-muted-foreground">Ничего не найдено</div>
      )}
    </Card>
  );
}
