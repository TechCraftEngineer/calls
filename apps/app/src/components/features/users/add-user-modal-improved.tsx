"use client";

import { Button, Input, PasswordInput } from "@calls/ui";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AddUserForm } from "./types";

interface AddUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onSubmit: (form: AddUserForm) => Promise<void>;
}

const defaultForm: AddUserForm = {
  email: "",
  password: "",
  givenName: "",
  familyName: "",
  internalExtensions: "",
  mobilePhones: "",
  telegramChatId: "",
  telegram_daily_report: false,
  telegram_manager_report: false,
  max_chat_id: "",
  max_daily_report: false,
  max_manager_report: false,
  filter_exclude_answering_machine: false,
  filter_min_duration: 0,
  filter_min_replicas: 0,
  email: "",
  email_daily_report: false,
  email_weekly_report: false,
  email_monthly_report: false,
  telegram_weekly_report: false,
  telegram_monthly_report: false,
  report_include_call_summaries: false,
  report_detailed: false,
  report_include_avg_value: false,
  report_include_avg_rating: false,
  kpi_base_salary: 0,
  kpi_target_bonus: 0,
  kpi_target_talk_time_minutes: 0,
  evaluation_template_slug: "general",
  evaluation_custom_instructions: "",
};

export default function AddUserModal({ onClose, onSubmit }: AddUserModalProps) {
  const [form, setForm] = useState<AddUserForm>(defaultForm);
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

    if (!form.email.trim()) {
      newErrors.email = "Обязательное поле";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Введите корректный email адрес";
    }

    if (!form.password.trim()) {
      newErrors.password = "Обязательное поле";
    } else if (form.password.length < 8) {
      newErrors.password = "Минимум 8 символов";
    }

    if (!form.givenName.trim()) {
      newErrors.givenName = "Обязательное поле";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0];
      const element = document.getElementById(
        firstErrorField === "email" ? "email" : firstErrorField,
      );
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
      await onSubmit({
        ...form,
        email: form.email.trim().toLowerCase(),
        givenName: form.givenName.trim(),
        familyName: form.familyName.trim(),
        internalExtensions: form.internalExtensions.trim(),
        mobilePhones: form.mobilePhones.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setErrors({
        submit:
          err instanceof Error
            ? err.message
            : "Ошибка при создании пользователя",
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
        className="bg-white rounded-xl p-6 max-w-[440px] w-full max-h-[90vh] overflow-y-auto mx-4"
        onClick={(e) => e.stopPropagation()}
        style={{ overscrollBehavior: "contain" }}
      >
        <h2 id="modal-title" className="m-0 mb-5 text-lg font-bold">
          Добавить пользователя
        </h2>

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
            <label htmlFor="email" className="block mb-1 text-sm font-semibold">
              Email *
            </label>
            <Input
              ref={firstInputRef}
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm((f) => ({ ...f, email: e.target.value }));
                if (errors.email) {
                  setErrors((e) => ({ ...e, email: "" }));
                }
              }}
              className="w-full py-2 px-3 border border-gray-300 rounded-md text-base"
              placeholder="example@mail.com"
              autoComplete="email"
              spellCheck={false}
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "email-error" : undefined}
              style={{ fontSize: "16px" }}
              required
            />
            {errors.email && (
              <p
                id="email-error"
                className="text-red-500 text-sm mt-1"
                role="alert"
              >
                {errors.email}
              </p>
            )}
          </div>

          <div className="mb-3">
            <label
              htmlFor="password"
              className="block mb-1 text-sm font-semibold"
            >
              Пароль *
            </label>
            <PasswordInput
              id="password"
              name="password"
              value={form.password}
              onChange={(e) => {
                setForm((f) => ({ ...f, password: e.target.value }));
                if (errors.password) {
                  setErrors((e) => ({ ...e, password: "" }));
                }
              }}
              className="w-full py-2 px-3 border border-gray-300 rounded-md text-base"
              autoComplete="new-password"
              aria-invalid={errors.password ? "true" : "false"}
              aria-describedby={errors.password ? "password-error" : undefined}
              style={{ fontSize: "16px" }}
              required
            />
            {errors.password && (
              <p
                id="password-error"
                className="text-red-500 text-sm mt-1"
                role="alert"
              >
                {errors.password}
              </p>
            )}
          </div>

          <div className="mb-3">
            <label
              htmlFor="givenName"
              className="block mb-1 text-sm font-semibold"
            >
              Имя *
            </label>
            <Input
              id="givenName"
              name="givenName"
              type="text"
              value={form.givenName}
              onChange={(e) => {
                setForm((f) => ({ ...f, givenName: e.target.value }));
                if (errors.givenName) {
                  setErrors((e) => ({ ...e, givenName: "" }));
                }
              }}
              className="w-full py-2 px-3 border border-gray-300 rounded-md text-base"
              autoComplete="given-name"
              aria-invalid={errors.givenName ? "true" : "false"}
              aria-describedby={
                errors.givenName ? "givenName-error" : undefined
              }
              style={{ fontSize: "16px" }}
              required
            />
            {errors.givenName && (
              <p
                id="givenName-error"
                className="text-red-500 text-sm mt-1"
                role="alert"
              >
                {errors.givenName}
              </p>
            )}
          </div>

          <div className="mb-3">
            <label
              htmlFor="familyName"
              className="block mb-1 text-sm font-semibold"
            >
              Фамилия
            </label>
            <Input
              id="familyName"
              name="familyName"
              type="text"
              value={form.familyName}
              onChange={(e) =>
                setForm((f) => ({ ...f, familyName: e.target.value }))
              }
              className="w-full py-2 px-3 border border-gray-300 rounded-md text-base"
              autoComplete="family-name"
              style={{ fontSize: "16px" }}
            />
          </div>

          <div className="mb-3">
            <label
              htmlFor="internalExtensions"
              className="block mb-1 text-sm font-semibold"
            >
              Внутренние номера
            </label>
            <Input
              id="internalExtensions"
              name="internalExtensions"
              type="text"
              value={form.internalExtensions}
              onChange={(e) =>
                setForm((f) => ({ ...f, internalExtensions: e.target.value }))
              }
              className="w-full py-2 px-3 border border-gray-300 rounded-md text-base"
              placeholder="101, 102 или admin, ovchinnikov_nikita…"
              style={{ fontSize: "16px" }}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="mobilePhones"
              className="block mb-1 text-sm font-semibold"
            >
              Мобильные номера
            </label>
            <Input
              id="mobilePhones"
              name="mobilePhones"
              type="text"
              value={form.mobilePhones}
              onChange={(e) =>
                setForm((f) => ({ ...f, mobilePhones: e.target.value }))
              }
              className="w-full py-2 px-3 border border-gray-300 rounded-md text-base"
              placeholder="79XXXXXXXXX, можно несколько через запятую…"
              style={{ fontSize: "16px" }}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-[44px]"
              aria-label="Отменить добавление пользователя"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="touch"
              disabled={submitting}
              aria-label={submitting ? "Сохранение…" : "Добавить пользователя"}
            >
              {submitting ? "Сохранение…" : "Добавить"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
