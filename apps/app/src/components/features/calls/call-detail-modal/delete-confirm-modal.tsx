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
      <DialogContent className="z-[100] max-w-[480px]" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>Подтверждение удаления</DialogTitle>
          <DialogDescription>
            Вы уверены, что хотите удалить этот звонок?
          </DialogDescription>
        </DialogHeader>
        {call && (
          <div className="bg-muted rounded-lg p-3 text-[13px] text-muted-foreground">
            <div>
              <strong className="text-foreground">Номер:</strong> {call.number}
            </div>
            <div>
              <strong className="text-foreground">Дата:</strong>{" "}
              {new Date(call.timestamp).toLocaleString("ru-RU")}
            </div>
            <div>
              <strong className="text-foreground">Длительность:</strong>{" "}
              {Math.round(call.duration ?? 0)} с
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={deleting}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? (
              <>
                <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Удаление...
              </>
            ) : (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Удалить
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
