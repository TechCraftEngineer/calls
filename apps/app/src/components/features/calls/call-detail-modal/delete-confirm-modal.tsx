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
import type { CallDetail } from "./types";

interface DeleteConfirmModalProps {
  call: CallDetail | null;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  call,
  deleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="z-[100] max-w-md" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-4 text-destructive" />
            Подтверждение удаления
          </DialogTitle>
          <DialogDescription>
            Вы уверены, что хотите удалить этот звонок? Это действие нельзя
            отменить.
          </DialogDescription>
        </DialogHeader>
        {call && (
          <div className="bg-muted/50 rounded-lg border border-border/60 p-4 text-sm">
            <div className="space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Номер:</span>
                <span className="font-medium">{call.number}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Дата:</span>
                <span className="font-medium">
                  {new Date(call.timestamp).toLocaleString("ru-RU")}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Длительность:</span>
                <span className="font-medium">
                  {Math.round(call.duration ?? 0)} с
                </span>
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={deleting}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Удаление...
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Удалить
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
