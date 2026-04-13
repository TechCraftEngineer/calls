"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useORPC } from "@/orpc/react";
import { ITEMS_PER_PAGE } from "../constants";
import type { Employee, PhoneNumber } from "../types";

export interface UseDirectoryDataReturn {
  // Data
  employees: Employee[];
  numbers: PhoneNumber[];
  hasData: boolean;

  // Search
  employeeSearch: string;
  setEmployeeSearch: (value: string) => void;
  numberSearch: string;
  setNumberSearch: (value: string) => void;

  // Pagination
  employeePage: number;
  setEmployeePage: (value: number | ((prev: number) => number)) => void;
  numberPage: number;
  setNumberPage: (value: number | ((prev: number) => number)) => void;

  // Filtered data
  filteredEmployees: Employee[];
  filteredNumbers: PhoneNumber[];
  paginatedEmployees: Employee[];
  paginatedNumbers: PhoneNumber[];
  totalEmployeePages: number;
  totalNumberPages: number;

  // Selection state
  allEmployeesSelected: boolean;
  allNumbersSelected: boolean;

  // Reset
  resetPagination: () => void;
}

export function useDirectoryData(
  selectedEmployees: Set<string>,
  selectedNumbers: Set<string>,
): UseDirectoryDataReturn {
  const orpc = useORPC();

  // Search and pagination state
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [numberSearch, setNumberSearch] = useState("");
  const [employeePage, setEmployeePage] = useState(0);
  const [numberPage, setNumberPage] = useState(0);

  // Queries
  const { data: employeesData } = useQuery(orpc.settings.listPbxEmployees.queryOptions({}));
  const employees = (employeesData ?? []) as Employee[];

  const { data: numbersData } = useQuery(orpc.settings.listPbxNumbers.queryOptions({}));
  const numbers = (numbersData ?? []) as PhoneNumber[];

  // Filtered and paginated data
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const search = employeeSearch.toLowerCase();
    return employees.filter(
      (e) =>
        e.displayName.toLowerCase().includes(search) ||
        e.extension?.toLowerCase().includes(search) ||
        e.email?.toLowerCase().includes(search),
    );
  }, [employees, employeeSearch]);

  const filteredNumbers = useMemo(() => {
    if (!numberSearch.trim()) return numbers;
    const search = numberSearch.toLowerCase();
    return numbers.filter(
      (n) =>
        n.phoneNumber.toLowerCase().includes(search) ||
        n.extension?.toLowerCase().includes(search) ||
        n.label?.toLowerCase().includes(search) ||
        n.employee?.displayName.toLowerCase().includes(search),
    );
  }, [numbers, numberSearch]);

  const paginatedEmployees = useMemo(() => {
    const start = employeePage * ITEMS_PER_PAGE;
    return filteredEmployees.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEmployees, employeePage]);

  const paginatedNumbers = useMemo(() => {
    const start = numberPage * ITEMS_PER_PAGE;
    return filteredNumbers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredNumbers, numberPage]);

  const totalEmployeePages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const totalNumberPages = Math.ceil(filteredNumbers.length / ITEMS_PER_PAGE);

  // Derived selectAll flags (only for current page)
  const allEmployeesSelected =
    paginatedEmployees.length > 0 && paginatedEmployees.every((e) => selectedEmployees.has(e.id));
  const allNumbersSelected =
    paginatedNumbers.length > 0 && paginatedNumbers.every((n) => selectedNumbers.has(n.id));

  const resetPagination = () => {
    setEmployeePage(0);
    setNumberPage(0);
  };

  const hasData = employees.length > 0 || numbers.length > 0;

  return {
    employees,
    numbers,
    hasData,
    employeeSearch,
    setEmployeeSearch,
    numberSearch,
    setNumberSearch,
    employeePage,
    setEmployeePage,
    numberPage,
    setNumberPage,
    filteredEmployees,
    filteredNumbers,
    paginatedEmployees,
    paginatedNumbers,
    totalEmployeePages,
    totalNumberPages,
    allEmployeesSelected,
    allNumbersSelected,
    resetPagination,
  };
}
