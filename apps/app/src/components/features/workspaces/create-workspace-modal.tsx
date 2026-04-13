"use client";

import { Button, toast } from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useORPC } from "@/orpc/react";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(100, "Не более 100 символов"),
});

type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onSuccess: (workspaceId: string) => void | Promise<void>;
}

export default function CreateWorkspaceModal({ onClose, onSuccess }: CreateWorkspaceModalProps) {
  const orpc = useORPC();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    mode: "onBlur",
    defaultValues: { name: "" },
  });

  const createMutation = useMutation(
    orpc.workspaces.create.mutationOptions({
      onSuccess: async (workspace) => {
        toast.success("Компания создана");
        await onSuccess(workspace.id);
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Не удалось создать компанию";
        setError("root", { message: msg });
        toast.error(msg);
      },
    }),
  );

  const onSubmit = (data: CreateWorkspaceFormData) => {
    createMutation.mutate({ name: data.name });
  };

  // Focus management and keyboard trap
  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement;

    // Autofocus input on desktop
    if (window.innerWidth >= 768) {
      inputRef.current?.focus();
    }

    // Keyboard trap
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusableElements?.length) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Return focus to previous element
      previousActiveElement?.focus();
    };
  }, [onClose]);

  // Focus first error on submit
  useEffect(() => {
    if (errors.name) {
      setFocus("name");
    }
  }, [errors.name, setFocus]);

  const { ref: registerRef, ...registerRest } = register("name");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      style={{ overscrollBehavior: "contain" }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="w-full max-w-[440px] bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 flex flex-col gap-6"
        style={{ touchAction: "manipulation" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 bg-[#FFD600] rounded-lg flex items-center justify-center font-black text-lg"
              aria-hidden="true"
            >
              M
            </div>
            <h2 id="modal-title" className="text-xl font-bold text-gray-900 m-0">
              Создать компанию
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Закрыть модальное окно"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD600] focus-visible:ring-offset-2"
          >
            <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>

        <p id="modal-description" className="text-sm text-gray-500 m-0 leading-relaxed">
          Компания объединяет команду и данные. Укажите название компании или проекта.
        </p>

        {errors.root && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-[13px] font-medium flex items-center gap-2"
          >
            <span aria-hidden="true">⚠️</span>
            {errors.root.message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-2">
            <label htmlFor="company-name" className="text-[13px] font-semibold text-gray-700">
              Название
            </label>
            <input
              id="company-name"
              type="text"
              autoComplete="organization"
              spellCheck="false"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              className={`w-full min-h-[44px] px-4 rounded-lg border text-base md:text-sm transition-all focus-visible:outline-none focus-visible:ring-4 ${
                errors.name
                  ? "border-red-500 bg-red-50 focus-visible:border-red-500 focus-visible:ring-red-500/10"
                  : "border-gray-200 focus-visible:border-[#FFD600] focus-visible:ring-[#FFD600]/10"
              }`}
              placeholder="Acme Inc…"
              style={{ touchAction: "manipulation" }}
              {...registerRest}
              ref={(e) => {
                registerRef(e);
                inputRef.current = e;
              }}
            />
            {errors.name && (
              <span id="name-error" role="alert" className="text-xs text-red-500">
                {errors.name.message}
              </span>
            )}
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              type="button"
              variant="link"
              onClick={onClose}
              className="text-foreground min-h-[44px]"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="dark"
              disabled={createMutation.isPending}
              aria-busy={createMutation.isPending}
              className="min-h-[44px] gap-2"
            >
              {createMutation.isPending && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {createMutation.isPending ? "Создание…" : "Создать компанию"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
