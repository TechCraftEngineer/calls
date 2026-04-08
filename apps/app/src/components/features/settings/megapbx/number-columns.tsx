"use client";

import { Checkbox } from "@calls/ui";
import type { ColumnDef } from "@tanstack/react-table";
import type { PbxNumberItem } from "../types";

function normalizePhone(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

interface GetNumberColumnsProps {
  excludedSet: Set<string>;
  setExcludedSet: React.Dispatch<React.SetStateAction<Set<string>>>;
  savingExcludedNumbers: boolean;
  onSaveExcludedNumbers: (excludePhoneNumbers: string[]) => Promise<void>;
}

export function getNumberColumns({
  excludedSet,
  setExcludedSet,
  savingExcludedNumbers,
  onSaveExcludedNumbers,
}: GetNumberColumnsProps): ColumnDef<PbxNumberItem>[] {
  return [
    {
      accessorKey: "phoneNumber",
      header: "Номер",
      cell: ({ row }) => row.original.phoneNumber,
    },
    {
      accessorKey: "extension",
      header: "Внутренний номер",
      cell: ({ row }) => row.original.extension ?? "—",
    },
    {
      id: "employee",
      header: "Сотрудник",
      cell: ({ row }) => row.original.employee?.displayName ?? "—",
    },
    {
      id: "import",
      header: "Исключить",
      enableSorting: false,
      cell: ({ row }) => {
        const number = row.original;
        const phone = normalizePhone(number.phoneNumber);
        const extension = normalizePhone(number.extension);
        const keys = [phone, extension].filter(Boolean);
        const isExcluded = keys.some((value) => excludedSet.has(value));
        const checkboxLabel = number.phoneNumber || number.extension || number.externalId;

        return (
          <label
            htmlFor={`exclude-number-${number.externalId}`}
            className="flex items-center gap-2"
          >
            <Checkbox
              id={`exclude-number-${number.externalId}`}
              checked={isExcluded}
              disabled={savingExcludedNumbers}
              aria-label={`Исключить номер ${checkboxLabel}`}
              onCheckedChange={(checked) => {
                setExcludedSet((prev) => {
                  const next = new Set(prev);
                  if (checked === true) {
                    for (const key of keys) next.add(key);
                  } else {
                    for (const key of keys) next.delete(key);
                  }
                  void onSaveExcludedNumbers(Array.from(next));
                  return next;
                });
              }}
            />
            <span className="text-muted-foreground text-xs">{isExcluded ? "Да" : "Нет"}</span>
          </label>
        );
      },
    },
  ];
}
