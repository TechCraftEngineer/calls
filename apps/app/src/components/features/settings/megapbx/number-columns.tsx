"use client";

import {
  Button,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@calls/ui";
import type { ColumnDef } from "@tanstack/react-table";
import type { PbxNumberItem } from "../types";
import { LinkStatus } from "./link-status";

export type NumberLinkOption = { value: string; label: string };

function normalizePhone(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

export function getNumberColumns(
  numberLinkOptions: Record<string, NumberLinkOption[]>,
  selectedLinks: Record<string, string>,
  setSelectedLinks: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  excludedSet: Set<string>,
  setExcludedSet: React.Dispatch<React.SetStateAction<Set<string>>>,
  savingExcludedNumbers: boolean,
  onSaveExcludedNumbers: (excludePhoneNumbers: string[]) => Promise<void>,
  onLink: (input: {
    targetType: "number";
    targetExternalId: string;
    userId?: string | null;
  }) => Promise<void>,
  onUnlink: (input: { targetType: "number"; targetExternalId: string }) => Promise<void>,
): ColumnDef<PbxNumberItem>[] {
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
      id: "link",
      header: "Привязка",
      cell: ({ row }) => (
        <LinkStatus
          linkedUser={row.original.linkedUser}
          linkedInvitation={row.original.linkedInvitation}
        />
      ),
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
    {
      id: "actions",
      header: "Действие",
      enableSorting: false,
      cell: ({ row }) => {
        const number = row.original;
        const options = numberLinkOptions[number.externalId] ?? [];

        return (
          <div className="flex min-w-65 flex-wrap items-center gap-2">
            {options.length > 0 && (
              <Select
                value={selectedLinks[number.externalId] ?? ""}
                onValueChange={(value) =>
                  setSelectedLinks((prev) => ({
                    ...prev,
                    [number.externalId]: value,
                  }))
                }
              >
                <SelectTrigger className="w-65">
                  <SelectValue placeholder="Выберите пользователя" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selectedLinks[number.externalId]}
              onClick={() => {
                const selected = selectedLinks[number.externalId];
                if (!selected) return;
                const [, id] = selected.split(":");
                void onLink({
                  targetType: "number",
                  targetExternalId: number.externalId,
                  userId: id,
                });
              }}
            >
              Привязать
            </Button>
            {number.link && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  void onUnlink({
                    targetType: "number",
                    targetExternalId: number.externalId,
                  })
                }
              >
                Отвязать
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
