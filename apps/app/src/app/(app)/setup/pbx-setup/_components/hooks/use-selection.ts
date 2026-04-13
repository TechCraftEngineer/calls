"use client";

import { toast } from "@calls/ui";
import { useCallback, useState } from "react";
import type { Employee, PhoneNumber } from "../types";

export interface UseSelectionReturn {
  selectedEmployees: Set<string>;
  selectedNumbers: Set<string>;
  handleToggleEmployee: (id: string) => void;
  handleToggleNumber: (id: string) => void;
  handleSelectAllEmployees: (paginatedEmployees: Employee[], allEmployeesSelected: boolean) => void;
  handleSelectAllNumbers: (paginatedNumbers: PhoneNumber[], allNumbersSelected: boolean) => void;
  handleSelectAllFilteredEmployees: (filteredEmployees: Employee[]) => void;
  handleSelectAllFilteredNumbers: (filteredNumbers: PhoneNumber[]) => void;
}

export function useSelection(): UseSelectionReturn {
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());

  const handleToggleEmployee = useCallback((id: string) => {
    setSelectedEmployees((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleToggleNumber = useCallback((id: string) => {
    setSelectedNumbers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllEmployees = useCallback(
    (paginatedEmployees: Employee[], allEmployeesSelected: boolean) => {
      setSelectedEmployees((prev) => {
        const newSet = new Set(prev);
        if (allEmployeesSelected) {
          // Unselect all on current page
          paginatedEmployees.forEach((e) => {
            newSet.delete(e.id);
          });
        } else {
          // Select all on current page
          paginatedEmployees.forEach((e) => {
            newSet.add(e.id);
          });
        }
        return newSet;
      });
    },
    [],
  );

  const handleSelectAllNumbers = useCallback(
    (paginatedNumbers: PhoneNumber[], allNumbersSelected: boolean) => {
      setSelectedNumbers((prev) => {
        const newSet = new Set(prev);
        if (allNumbersSelected) {
          // Unselect all on current page
          paginatedNumbers.forEach((n) => {
            newSet.delete(n.id);
          });
        } else {
          // Select all on current page
          paginatedNumbers.forEach((n) => {
            newSet.add(n.id);
          });
        }
        return newSet;
      });
    },
    [],
  );

  const handleSelectAllFilteredEmployees = useCallback((filteredEmployees: Employee[]) => {
    setSelectedEmployees((prev) => {
      const newSet = new Set(prev);
      filteredEmployees.forEach((e) => {
        newSet.add(e.id);
      });
      return newSet;
    });
    toast.success(`Выбрано ${filteredEmployees.length} сотрудников`);
  }, []);

  const handleSelectAllFilteredNumbers = useCallback((filteredNumbers: PhoneNumber[]) => {
    setSelectedNumbers((prev) => {
      const newSet = new Set(prev);
      filteredNumbers.forEach((n) => {
        newSet.add(n.id);
      });
      return newSet;
    });
    toast.success(`Выбрано ${filteredNumbers.length} номеров`);
  }, []);

  return {
    selectedEmployees,
    selectedNumbers,
    handleToggleEmployee,
    handleToggleNumber,
    handleSelectAllEmployees,
    handleSelectAllNumbers,
    handleSelectAllFilteredEmployees,
    handleSelectAllFilteredNumbers,
  };
}
