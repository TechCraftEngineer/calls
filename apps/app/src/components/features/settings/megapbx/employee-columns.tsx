"use client";

import { Badge, Button } from "@calls/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import type { PbxEmployeeItem } from "../types";
import { LinkStatus } from "./link-status";

export function getEmployeeColumns(
  onEditLink?: (employee: PbxEmployeeItem) => void,
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
      id: "linkedUser",
      header: "Пользователь",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <LinkStatus
            linkedUser={row.original.linkedUser}
            linkedInvitation={row.original.linkedInvitation}
          />
          {onEditLink && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => onEditLink(row.original)}
              aria-label="Изменить привязку"
            >
              <Pencil className="size-3.5" />
            </Button>
          )}
        </div>
      ),
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
  ];
}
