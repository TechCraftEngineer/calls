"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@calls/ui";
import { Loader2, Trash2 } from "lucide-react";
import type { CallWithDetails } from "./types";

interface BulkDeleteConfirmModalProps {
  calls: CallWithDetails[];
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function getRecordsLabel(count: number) {
  const remainder10 = count % 10;
  const remainder100 = count % 100;

  if (remainder100 >= 11 && remainder100 <= 14) {
    return "записей";
  }

  if (remainder10 === 1) {
    return "запись";
  }

  if (remainder10 >= 2 && remainder10 <= 4) {
    return "записи";
  }

  return "записей";
}

export function BulkDeleteConfirmModal({
  calls,
  deleting,
  onConfirm,
  onCancel,
}: BulkDeleteConfirmModalProps) {
  const previewCalls = calls.slice(0, 5);
  const hiddenCount = Math.max(calls.length - previewCalls.length, 0);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-4 text-destructive" />
            Удалить выбранные звонки
          </DialogTitle>
          <DialogDescription>
            Будет удалено {calls.length} {getRecordsLabel(calls.length)}. Это
            действие нельзя отменить.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg border border-border/60 p-4 text-sm">
          <div className="mb-2 font-medium">Выбраны звонки:</div>
          <div className="space-y-1.5">
            {previewCalls.map(({ call }) => (
              <div
                key={call.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate">{call.number || "Без номера"}</span>
                <span className="text-muted-foreground shrink-0">
                  {new Date(call.timestamp).toLocaleString("ru-RU")}
                </span>
              </div>
            ))}
            {hiddenCount > 0 && (
              <div className="text-muted-foreground text-sm">
                И еще {hiddenCount}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="link"
            onClick={onCancel}
            disabled={deleting}
            className="text-foreground"
          >
            Отмена
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Удалить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
