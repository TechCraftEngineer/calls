"use client";

import { Badge, DataGrid, DataGridContainer, DataGridPagination, DataGridTable } from "@calls/ui";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { SearchInput } from "@/components/ui/search-input";
import type { PbxNumberItem } from "../types";
import { getNumberColumns } from "./number-columns";

const normalizePhone = (value: string | null | undefined): string =>
  (value ?? "").replace(/\D/g, "");

interface NumbersTabProps {
  numbers: PbxNumberItem[];
  numbersLoading: boolean;
  numberSearch: string;
  onNumberSearchChange: (value: string) => void;
  excludedPhoneNumbers: string[];
  savingExcludedNumbers: boolean;
  onSaveExcludedNumbers: (excludePhoneNumbers: string[]) => Promise<void>;
}

export function NumbersTab({
  numbers,
  numbersLoading,
  numberSearch,
  onNumberSearchChange,
  excludedPhoneNumbers,
  savingExcludedNumbers,
  onSaveExcludedNumbers,
}: NumbersTabProps) {
  const [excludedSet, setExcludedSet] = useState<Set<string>>(
    () => new Set(excludedPhoneNumbers.map((value) => normalizePhone(value))),
  );

  useEffect(() => {
    setExcludedSet(new Set(excludedPhoneNumbers.map((value) => normalizePhone(value))));
  }, [excludedPhoneNumbers]);

  const filteredNumbers = useMemo(() => {
    const query = numberSearch.trim().toLowerCase();
    if (!query) return numbers;

    return numbers.filter((number) =>
      [number.phoneNumber, number.extension, number.employee?.displayName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [numberSearch, numbers]);

  const numberColumns = useMemo(
    () =>
      getNumberColumns({
        excludedSet,
        setExcludedSet,
        savingExcludedNumbers,
        onSaveExcludedNumbers,
      }),
    [excludedSet, savingExcludedNumbers, onSaveExcludedNumbers],
  );

  const excludedRowsCount = useMemo(() => {
    let count = 0;
    for (const number of filteredNumbers) {
      const phone = normalizePhone(number.phoneNumber);
      const extension = normalizePhone(number.extension);
      const keys = [phone, extension].filter(Boolean);
      if (keys.some((value) => excludedSet.has(value))) {
        count += 1;
      }
    }
    return count;
  }, [filteredNumbers, excludedSet]);

  const numberTable = useReactTable({
    data: filteredNumbers,
    columns: numberColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      sorting: [{ id: "phoneNumber", desc: false }],
      pagination: { pageIndex: 0, pageSize: 20 },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 className="font-semibold">Номера АТС</h4>
          <p className="text-sm text-muted-foreground">
            Список номеров, синхронизированных из АТС. Номера автоматически привязаны к сотрудникам.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <Badge variant="outline">
            {filteredNumbers.length} записей, исключено: {excludedRowsCount}
          </Badge>
          <SearchInput
            value={numberSearch}
            onChange={onNumberSearchChange}
            placeholder="Поиск по номеру, внутреннему номеру, сотруднику…"
            className="w-full sm:w-[320px]"
          />
        </div>
      </div>
      <DataGrid
        table={numberTable}
        recordCount={filteredNumbers.length}
        isLoading={numbersLoading}
        emptyMessage={
          numbers.length === 0
            ? "Номера пока не синхронизированы. Сначала загрузите справочник из АТС."
            : "По текущему запросу номера не найдены."
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
            <DataGridTable<PbxNumberItem> />
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
