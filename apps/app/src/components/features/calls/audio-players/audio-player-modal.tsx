"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@calls/ui";
import { useQuery } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import AudioPlayer from "@/components/ui/audio-player";
import { useORPC } from "@/orpc/react";

interface AudioPlayerModalProps {
  callId: string;
  number: string;
  onClose: () => void;
}

export default function AudioPlayerModal({ callId, number, onClose }: AudioPlayerModalProps) {
  const orpc = useORPC();
  const { data, isPending, isError, error } = useQuery(
    orpc.calls.getPlaybackUrl.queryOptions({ input: { call_id: callId } }),
  );

  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElRef = useRef<HTMLElement | null>(null);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    previouslyFocusedElRef.current = document.activeElement as HTMLElement;
    // Фокус на кнопку закрытия, чтобы пользователь мог сразу нажать Escape/Tab.
    closeButtonRef.current?.focus();

    return () => {
      previouslyFocusedElRef.current?.focus?.();
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key !== "Tab") return;

    const container = modalRef.current;
    if (!container) return;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    }
  };

  const content = (
    <div
      ref={modalRef}
      className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-modal-title"
      onKeyDown={handleKeyDown}
    >
      <Card
        className="mx-4 w-full max-w-110 border-border/60 shadow-xl animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <CardTitle id="audio-modal-title" className="text-sm font-medium text-muted-foreground">
            Запись звонка: <span className="font-semibold text-foreground">{number}</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Закрыть"
            className="size-9 rounded-full"
            ref={closeButtonRef}
          >
            <XIcon className="size-5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {isPending && (
            <div className="flex items-center justify-center py-8">
              <div
                className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary"
                aria-hidden
              />
            </div>
          )}
          {isError && (
            <p className="py-6 text-center text-sm text-destructive">
              {error?.message ?? "Не удалось загрузить запись"}
            </p>
          )}
          {data?.url && (
            <AudioPlayer
              src={data.url}
              autoPlay={true}
              durationSeconds={data.duration ?? undefined}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );

  return createPortal(content, document.body);
}
