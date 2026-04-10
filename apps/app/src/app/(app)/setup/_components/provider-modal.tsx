"use client";

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@calls/ui";
import { useState } from "react";
import type { ModalProps } from "./types";

const providers = [
  { id: "megafon", name: "Мегафон", available: true },
  { id: "mango", name: "Mango Office", available: false },
  { id: "mts", name: "МТС Exolve", available: false },
  { id: "beeline", name: "Билайн", available: false },
];

export function ProviderModal({ open, onOpenChange, onComplete }: ModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Выберите провайдера</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-4">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => p.available && setSelected(p.id)}
              disabled={!p.available}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                selected === p.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              } ${!p.available ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="font-medium">{p.name}</div>
              {!p.available && <div className="text-xs text-muted-foreground">Скоро</div>}
            </button>
          ))}
        </div>
        <Button onClick={onComplete} disabled={!selected} className="w-full">
          Продолжить
        </Button>
      </DialogContent>
    </Dialog>
  );
}
