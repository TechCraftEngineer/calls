"use client";

import { Badge, Button } from "@calls/ui";
import { Link2, Link2Off } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { PbxEmployeeItem } from "../types";
import { LinkStatus } from "./link-status";

export function getEmployeeColumns(
  onOpenLinkDialog: (employee: PbxEmployeeItem) => void,
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
        const isLinking = linkingEmployeeIds[employee.externalId];
        const isUnlinking = unlinkingEmployeeIds[employee.externalId];
        const isProcessing = isLinking || isUnlinking;

        return (
          <div className="flex items-center gap-2">
            {!employee.link ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isProcessing}
                onClick={() => onOpenLinkDialog(employee)}
              >
                <Link2 className="h-4 w-4" />
                {isLinking ? "Привязка…" : "Привязать"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2 text-destructive hover:text-destructive"
                disabled={isProcessing}
                onClick={async () =>
                  onUnlink({
                    targetType: "employee",
                    targetExternalId: employee.externalId,
                  })
                }
              >
                <Link2Off className="h-4 w-4" />
                {isUnlinking ? "Отвязка…" : "Отвязать"}
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
