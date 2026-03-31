"use client";

import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@calls/ui";
import type { ColumnDef } from "@tanstack/react-table";
import type { PbxEmployeeItem } from "../types";
import { LinkStatus } from "./link-status";

export type EmployeeLinkOption = { value: string; label: string };

export function getEmployeeColumns(
  employeeLinkOptions: Record<string, EmployeeLinkOption[]>,
  selectedLinks: Record<string, string>,
  setSelectedLinks: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  onLink: (input: {
    targetType: "employee";
    targetExternalId: string;
    userId?: string | null;
    invitationId?: string | null;
  }) => Promise<void>,
  onUnlink: (input: { targetType: "employee"; targetExternalId: string }) => Promise<void>,
  linkingEmployeeIds: Record<string, boolean>,
  unlinkingEmployeeIds: Record<string, boolean>,
): ColumnDef<PbxEmployeeItem>[] {
  return [
    {
      accessorKey: "displayName",
      header: "Сотрудник",
      cell: ({ row }) => row.original.displayName,
    },
    {
      accessorKey: "extension",
      header: "Внутренний",
      cell: ({ row }) => row.original.extension ?? "—",
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email ?? "—",
    },
    {
      id: "status",
      header: "Статус",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Активен" : "Неактивен"}
        </Badge>
      ),
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
        const employee = row.original;
        const options = employeeLinkOptions[employee.externalId] ?? [];

        return (
          <div className="flex min-w-65 flex-wrap items-center gap-2">
            {options.length > 0 && (
              <Select
                value={selectedLinks[employee.externalId] ?? ""}
                onValueChange={(value) =>
                  setSelectedLinks((prev) => ({
                    ...prev,
                    [employee.externalId]: value,
                  }))
                }
              >
                <SelectTrigger className="w-65">
                  <SelectValue placeholder="Выберите связь" />
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
              disabled={
                !selectedLinks[employee.externalId] ||
                linkingEmployeeIds[employee.externalId] ||
                unlinkingEmployeeIds[employee.externalId]
              }
              onClick={async () => {
                const selected = selectedLinks[employee.externalId];
                if (!selected) return;
                const colonIdx = selected.indexOf(":");
                const kind = colonIdx >= 0 ? selected.slice(0, colonIdx) : "user";
                const id = colonIdx >= 0 ? selected.slice(colonIdx + 1) : selected;
                await onLink({
                  targetType: "employee",
                  targetExternalId: employee.externalId,
                  userId: kind === "user" ? id : null,
                  invitationId: kind === "invite" ? id : null,
                });
              }}
            >
              {linkingEmployeeIds[employee.externalId] ? "Привязка…" : "Привязать"}
            </Button>
            {employee.link && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={
                  unlinkingEmployeeIds[employee.externalId] ||
                  linkingEmployeeIds[employee.externalId]
                }
                onClick={async () =>
                  onUnlink({
                    targetType: "employee",
                    targetExternalId: employee.externalId,
                  })
                }
              >
                {unlinkingEmployeeIds[employee.externalId] ? "Отвязка…" : "Отвязать"}
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
