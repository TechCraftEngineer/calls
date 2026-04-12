"use client";

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@calls/ui";
import { Check, Phone } from "lucide-react";
import { useState } from "react";
import type { ModalProps } from "@/components/features/setup";

interface Provider {
  id: string;
  name: string;
  available: boolean;
  icon: React.ReactNode;
  color: string;
}

const providers: Provider[] = [
  {
    id: "megafon",
    name: "Мегафон",
    available: true,
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
    ),
    color: "#00AA00",
  },
  {
    id: "mango",
    name: "Mango Office",
    available: false,
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
      </svg>
    ),
    color: "#FF6600",
  },
  {
    id: "mts",
    name: "МТС Exolve",
    available: false,
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    color: "#E30613",
  },
  {
    id: "beeline",
    name: "Билайн",
    available: false,
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 4a6 6 0 1 1-6 6 6 6 0 0 1 6-6z" />
      </svg>
    ),
    color: "#F4C400",
  },
];

export function ProviderModal({ open, onOpenChange, onComplete }: ModalProps<string | null>) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleComplete = () => {
    onComplete(selected);
  };

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
              className={`group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                selected === p.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "hover:bg-muted/50 hover:border-muted-foreground/20"
              } ${!p.available ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {/* Icon with brand color */}
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm transition-transform group-hover:scale-105"
                style={{ backgroundColor: p.color }}
              >
                {p.available && selected === p.id ? (
                  <Check className="size-5" />
                ) : (
                  <Phone className="size-5" />
                )}
              </div>

              {/* Name and status */}
              <div className="flex-1 min-w-0">
                <div className="font-medium">{p.name}</div>
                {!p.available && <div className="text-xs text-muted-foreground">Скоро</div>}
              </div>

              {/* Selection indicator */}
              {selected === p.id && p.available && (
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" />
                </div>
              )}
            </button>
          ))}
        </div>
        <Button onClick={handleComplete} disabled={!selected} className="w-full">
          Продолжить
        </Button>
      </DialogContent>
    </Dialog>
  );
}
