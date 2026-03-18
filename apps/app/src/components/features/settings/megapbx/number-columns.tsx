"use client";

import {
  Button,
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

export function getNumberColumns(
  numberLinkOptions: Record<string, NumberLinkOption[]>,
  selectedLinks: Record<string, string>,
  setSelectedLinks: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >,
  onLink: (input: {
    targetType: "number";
    targetExternalId: string;
    userId?: string | null;
  }) => Promise<void>,
  onUnlink: (input: {
    targetType: "number";
    targetExternalId: string;
  }) => Promise<void>,
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
