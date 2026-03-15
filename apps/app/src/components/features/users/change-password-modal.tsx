"use client";

import { Button, PasswordInput } from "@calls/ui";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ManagedUser, PasswordForm } from "./types";

interface ChangePasswordModalProps {
  user: ManagedUser;
  onClose: () => void;
  onSubmit: (userId: string, form: PasswordForm) => Promise<void>;
}

export default function ChangePasswordModal({
  user,
  onClose,
  onSubmit,
}: ChangePasswordModalProps) {
  const [form, setForm] = useState<PasswordForm>({
    new_password: "",
    confirm_password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus trap
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    firstElement?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener("keydown", handleTab);
    return () => modal.removeEventListener("keydown", handleTab);
  }, []);

  // Escape to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.new_password) {
      newErrors.new_password = "Обязательное поле";
    } else if (form.new_password.length < 8) {
      newErrors.new_password = "Минимум 8 символов";
    }

    if (!form.confirm_password) {
      newErrors.confirm_password = "Обязательное поле";
    } else if (form.new_password !== form.confirm_password) {
      newErrors.confirm_password = "Пароли не совпадают";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0];
      const element = document.getElementById(firstErrorField);
      element?.focus();
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await onSubmit(String(user.id), form);
      onClose();
    } catch (err: unknown) {
      setErrors({
        submit: err instanceof Error ? err.message : "Ошибка при смене пароля",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl p-6 max-w-[440px] w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        style={{ overscrollBehavior: "contain" }}
      >
        <h2 id="modal-title" className="m-0 mb-5 text-lg font-bold">
          Сменить пароль
        </h2>
        <p className="m-0 mb-4 text-sm text-gray-600">
          Пользователь:{" "}
          <span className="font-semibold">{String(user.username ?? "")}</span>
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {errors.submit && (
            <div
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md"
              role="alert"
            >
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          <div className="mb-3">
            <label
              htmlFor="new_password"
              className="block mb-1 text-sm font-semibold"
            >
              Новый пароль *
            </label>
            <PasswordInput
              ref={firstInputRef}
              id="new_password"
              name="new_password"
              value={form.new_password}
              onChange={(e) => {
                setForm((f) => ({ ...f, new_password: e.target.value }));
                if (errors.new_password) {
                  setErrors((e) => ({ ...e, new_password: "" }));
                }
              }}
              className="w-full py-2 px-3 border border-gray-300 rounded-md text-base"
              autoComplete="new-password"
              aria-invalid={errors.new_password ? "true" : "false"}
              aria-describedby={
                errors.new_password ? "new_password-error" : undefined
              }
              style={{ fontSize: "16px" }}
              required
            />
            {errors.new_password && (
              <p
                id="new_password-error"
                className="text-red-500 text-sm mt-1"
                role="alert"
              >
                {errors.new_password}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="confirm_password"
              className="block mb-1 text-sm font-semibold"
            >
              Подтверждение пароля *
            </label>
            <PasswordInput
              id="confirm_password"
              name="confirm_password"
              value={form.confirm_password}
              onChange={(e) => {
                setForm((f) => ({ ...f, confirm_password: e.target.value }));
                if (errors.confirm_password) {
                  setErrors((e) => ({ ...e, confirm_password: "" }));
                }
              }}
              className="w-full py-2 px-3 border border-gray-300 rounded-md text-base"
              autoComplete="new-password"
              aria-invalid={errors.confirm_password ? "true" : "false"}
              aria-describedby={
                errors.confirm_password ? "confirm_password-error" : undefined
              }
              style={{ fontSize: "16px" }}
              required
            />
            {errors.confirm_password && (
              <p
                id="confirm_password-error"
                className="text-red-500 text-sm mt-1"
                role="alert"
              >
                {errors.confirm_password}
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              size="touch"
              onClick={onClose}
              aria-label="Отменить смену пароля"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="touch"
              disabled={submitting}
              aria-label={submitting ? "Сохранение…" : "Сменить пароль"}
            >
              {submitting ? "Сохранение…" : "Сменить пароль"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
