"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useORPC } from "@/orpc/react";
import type { PbxEmployeeItem } from "../types";

interface LinkEmployeeDialogProps {
  employee: PbxEmployeeItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkEmployeeDialog({ employee, open, onOpenChange }: LinkEmployeeDialogProps) {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: members = [] } = useQuery(orpc.workspaces.listMembers.queryOptions());

  const linkMutation = useMutation(
    orpc.settings.linkEmployee.mutationOptions({
      onSuccess: () => {
        toast.success("Привязка обновлена");
        queryClient.invalidateQueries({
          queryKey: orpc.settings.listPbxEmployees.queryKey({}),
        });
        onOpenChange(false);
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
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Ошибка удаления привязки");
      },
    }),
  );

  const handleSave = () => {
    if (!employee) return;

    linkMutation.mutate({
      employeeExternalId: employee.externalId,
      userId: selectedUserId,
      invitationId: null,
    });
  };

  const handleUnlink = () => {
    if (!employee) return;

    unlinkMutation.mutate({
      employeeExternalId: employee.externalId,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedUserId(null);
    } else if (employee?.linkedUser) {
      setSelectedUserId(employee.linkedUser.id);
    }
    onOpenChange(newOpen);
  };

  if (!employee) return null;

  const isPending = linkMutation.isPending || unlinkMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Привязка сотрудника</DialogTitle>
          <DialogDescription>
            Привяжите сотрудника АТС к пользователю воркспейса
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Сотрудник АТС</Label>
            <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
              {employee.displayName}
              {employee.email && (
                <span className="ml-2 text-muted-foreground">({employee.email})</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-select">Пользователь воркспейса</Label>
            <Select
              value={selectedUserId || "none"}
              onValueChange={(value) => setSelectedUserId(value === "none" ? null : value)}
              disabled={isPending}
            >
              <SelectTrigger id="user-select">
                <SelectValue placeholder="Выберите пользователя" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Не привязан</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.user.name || member.user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {employee.linkedUser && (
            <Button
              variant="outline"
              onClick={handleUnlink}
              disabled={isPending}
              className="mr-auto"
            >
              {unlinkMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Удалить привязку
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {linkMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
