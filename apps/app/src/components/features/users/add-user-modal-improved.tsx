"use client";

import { Button, Input, PasswordInput } from "@calls/ui";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createUserSchema } from "@/lib/validations";
import type { AddUserForm } from "./types";

interface AddUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onSubmit: (form: AddUserForm) => Promise<void>;
}

const defaultForm: AddUserForm = {
  password: "",
  givenName: "",
  familyName: "",
  internalExtensions: "",
  mobilePhones: "",
  telegramChatId: "",
  telegramDailyReport: false,
  telegramManagerReport: false,
  maxChatId: "",
  maxDailyReport: false,
  maxManagerReport: false,
  filterExcludeAnsweringMachine: false,
  filterMinDuration: 0,
  filterMinReplicas: 0,
  email: "",
  emailDailyReport: false,
  emailWeeklyReport: false,
  emailMonthlyReport: false,
  telegramWeeklyReport: false,
  telegramMonthlyReport: false,
  reportIncludeCallSummaries: false,
  reportDetailed: false,
  reportIncludeAvgValue: false,
  reportIncludeAvgRating: false,
  kpiBaseSalary: 0,
  kpiTargetBonus: 0,
  kpiTargetTalkTimeMinutes: 0,
  evaluationTemplateSlug: "general",
  evaluationCustomInstructions: "",
};

export default function AddUserModal({
  onClose,
  onSuccess,
  onSubmit,
}: AddUserModalProps) {
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
    const result = createUserSchema.safeParse({
      email: form.email.trim(),
      password: form.password,
      givenName: form.givenName.trim(),
      familyName: form.familyName,
      internalExtensions: form.internalExtensions,
      mobilePhones: form.mobilePhones,
    });
    if (result.success) {
      setErrors({});
      return true;
    }
    const newErrors: Record<string, string> = {};
    for (const e of result.error.issues) {
      const field = (e.path[0] as string) ?? "root";
      if (!newErrors[field]) newErrors[field] = e.message;
    }
    setErrors(newErrors);
    const firstErrorField = Object.keys(newErrors)[0];
    const element = document.getElementById(
      firstErrorField === "email" ? "email" : firstErrorField,
    );
    element?.focus();
    return false;
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

      try {
        await onSuccess();
      } catch (successError) {
        console.error("Error in onSuccess callback:", successError);
        // Не показываем ошибку создания пользователя, так как пользователь уже создан
      } finally {
        onClose();
      }
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
              variant="link"
              onClick={onClose}
              className="min-h-[44px] text-primary"
              aria-label="Отменить добавление пользователя"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="default"
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
