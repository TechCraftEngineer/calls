"use client";

import {
  Badge,
  Card,
  DataGrid,
  DataGridContainer,
  DataGridPagination,
  DataGridTable,
} from "@calls/ui";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { SearchInput } from "@/components/ui/search-input";
import type { PbxNumberItem } from "../types";
import { getNumberColumns, type NumberLinkOption } from "./number-columns";

interface NumbersTabProps {
  numbers: PbxNumberItem[];
  numbersLoading: boolean;
  numberSearch: string;
  onNumberSearchChange: (value: string) => void;
  numberLinkOptions: Record<string, NumberLinkOption[]>;
  onLink: (input: {
    targetType: "number";
    targetExternalId: string;
    userId?: string | null;
  }) => Promise<void>;
  onUnlink: (input: {
    targetType: "number";
    targetExternalId: string;
  }) => Promise<void>;
}

export function NumbersTab({
  numbers,
  numbersLoading,
  numberSearch,
  onNumberSearchChange,
  numberLinkOptions,
  onLink,
  onUnlink,
}: NumbersTabProps) {
  const [selectedLinks, setSelectedLinks] = useState<Record<string, string>>(
    {},
  );

  const filteredNumbers = useMemo(() => {
    const query = numberSearch.trim().toLowerCase();
    if (!query) return numbers;

    return numbers.filter((number) =>
      [
        number.phoneNumber,
        number.extension,
        number.employee?.displayName,
        number.linkedUser?.email,
        number.linkedUser?.name,
        number.linkedInvitation?.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [numberSearch, numbers]);

  const numberColumns = useMemo(
    () =>
      getNumberColumns(
        numberLinkOptions,
        selectedLinks,
        setSelectedLinks,
        onLink,
        onUnlink,
      ),
    [numberLinkOptions, selectedLinks, onLink, onUnlink],
  );

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
          <h4 className="font-semibold">Привязка номеров</h4>
          <p className="text-sm text-muted-foreground">
            Используйте сопоставление номеров, если звонки нужно жёстко
            привязать к конкретным пользователям.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <Badge variant="outline">{filteredNumbers.length} записей</Badge>
          <SearchInput
            value={numberSearch}
            onChange={onNumberSearchChange}
            placeholder="Поиск по номеру, extension, сотруднику…"
            className="w-full sm:w-[320px]"
          />
        </div>
      </div>
      <Card className="overflow-hidden border-border/60">
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
      </Card>
    </div>
  );
}
