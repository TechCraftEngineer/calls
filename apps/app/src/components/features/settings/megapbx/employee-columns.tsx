"use client";

import { Badge } from "@calls/ui";
import type { ColumnDef } from "@tanstack/react-table";
import type { PbxEmployeeItem } from "../types";
import { LinkEmployeeCell } from "./link-employee-cell";

export function getEmployeeColumns(): ColumnDef<PbxEmployeeItem>[] {
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
      cell: ({ row }) => <LinkEmployeeCell employee={row.original} />,
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
