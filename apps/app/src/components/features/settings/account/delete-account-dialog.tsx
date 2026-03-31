"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@calls/ui";
import { Loader2, Trash2 } from "lucide-react";

const CONFIRM_PHRASE = "удалить аккаунт";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  confirmPhrase: string;
  onConfirmPhraseChange: (value: string) => void;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  confirmPhrase,
  onConfirmPhraseChange,
  deleting,
  onConfirm,
  onCancel,
}: DeleteAccountDialogProps) {
  const isConfirmed = confirmPhrase.trim().toLowerCase() === CONFIRM_PHRASE;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="z-100 max-w-md" showCloseButton={!deleting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-4 text-destructive" aria-hidden />
            Удалить аккаунт?
          </DialogTitle>
          <DialogDescription>
            Это действие необратимо. Все ваши данные будут удалены безвозвратно.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="delete-confirm" className="text-sm font-medium">
            Введите «{CONFIRM_PHRASE}» для подтверждения
          </label>
          <Input
            id="delete-confirm"
            value={confirmPhrase}
            onChange={(e) => onConfirmPhraseChange(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            className="w-full"
            disabled={deleting}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="link" onClick={onCancel} disabled={deleting} className="text-foreground">
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={deleting || !isConfirmed}
            aria-busy={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Удаление…
              </>
            ) : (
              <>
                <Trash2 className="size-4" aria-hidden />
                Удалить аккаунт
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
