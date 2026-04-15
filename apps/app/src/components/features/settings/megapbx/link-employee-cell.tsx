"use client";

import {
  Badge,
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  toast,
} from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { useORPC } from "@/orpc/react";
import type { PbxEmployeeItem } from "../types";

interface LinkEmployeeCellProps {
  employee: PbxEmployeeItem;
}

export function LinkEmployeeCell({ employee }: LinkEmployeeCellProps) {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: members = [] } = useQuery({
    ...orpc.workspaces.listMembers.queryOptions({
      input: { workspaceId: activeWorkspace?.id ?? "" },
    }),
    enabled: !!activeWorkspace?.id,
  });

  const linkMutation = useMutation(
    orpc.settings.linkEmployee.mutationOptions({
      onSuccess: () => {
        toast.success("Привязка обновлена");
        queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxEmployees.queryKey({}),
        });
        setOpen(false);
        setSearch("");
      },
      onError: (error) => {
        toast.error(error.message || "Ошибка обновления привязки");
      },
    }),
  );

  const unlinkMutation = useMutation(
    orpc.settings.unlinkEmployee.mutationOptions({
      onSuccess: () => {
        toast.success("Привязка удалена");
        queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxEmployees.queryKey({}),
        });
        setOpen(false);
        setSearch("");
      },
      onError: (error) => {
        toast.error(error.message || "Ошибка удаления привязки");
      },
    }),
  );

  const filteredMembers = useMemo(() => {
    if (!search) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) => m.user.name?.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q),
    );
  }, [members, search]);

  const handleLink = (userId: string) => {
    linkMutation.mutate({
      employeeExternalId: employee.externalId,
      userId,
      invitationId: null,
    });
  };

  const handleUnlink = () => {
    unlinkMutation.mutate({
      employeeExternalId: employee.externalId,
    });
  };

  const isPending = linkMutation.isPending || unlinkMutation.isPending;
  const linkedUser = employee.linkedUser;
  const linkedInvitation = employee.linkedInvitation;

  const displayValue = linkedUser
    ? linkedUser.name || linkedUser.email
    : linkedInvitation
      ? linkedInvitation.email
      : "Не привязан";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between text-left font-normal"
          disabled={isPending}
        >
          <span className="truncate">
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-3 animate-spin" />
                Обновление…
              </span>
            ) : (
              displayValue
            )}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Input
            placeholder="Поиск пользователя..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {(linkedUser || linkedInvitation) && (
            <>
              <button
                type="button"
                onClick={handleUnlink}
                disabled={isPending}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
              >
                <X className="size-4" />
                <span>Удалить привязку</span>
              </button>
              <Separator />
            </>
          )}
          {filteredMembers.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {search ? "Пользователи не найдены" : "Нет доступных пользователей"}
            </div>
          ) : (
            <div className="p-1">
              {filteredMembers.map((member) => {
                const isSelected = linkedUser?.id === member.userId;
                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() => handleLink(member.userId)}
                    disabled={isPending}
                    className="relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Check className={`size-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                    <div className="flex flex-1 flex-col items-start gap-0.5">
                      <span className="font-medium">{member.user.name || member.user.email}</span>
                      {member.user.name && (
                        <span className="text-xs text-muted-foreground">{member.user.email}</span>
                      )}
                    </div>
                    {isSelected && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        Текущий
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
