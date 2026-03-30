"use client";

import { Button, Input, PasswordInput } from "@calls/ui";
import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  type AddUserForm,
  formFieldWrap,
  formInput,
  formLabel,
  modalBoxClasses,
  modalOverlayClasses,
} from "./types";

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
  telegramDailyReport: false,
  telegramManagerReport: false,
  maxChatId: "",
  maxDailyReport: false,
  maxManagerReport: false,
  filterExcludeAnsweringMachine: false,
  filterMinDuration: 0,
  filterMinReplicas: 0,
  emailDailyReport: false,
  emailWeeklyReport: false,
  emailMonthlyReport: false,
  telegramWeeklyReport: false,
  telegramMonthlyReport: false,
  reportIncludeCallSummaries: false,
  reportDetailed: false,
  reportIncludeAvgRating: false,
  reportIncludeKpi: false,
  kpiBaseSalary: 0,
  kpiTargetBonus: 0,
  kpiTargetTalkTimeMinutes: 0,
  evaluationTemplateSlug: "general",
  evaluationCustomInstructions: "",
};

export default function AddUserModal({
  onClose,
  onSubmit,
  onSuccess,
}: AddUserModalProps) {
  const [form, setForm] = useState<AddUserForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState<
    Partial<Record<"email" | "password" | "givenName", string>>
  >({});
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const givenNameRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFormErrors({});
    const trimmedEmail = form.email.trim().toLowerCase();
    const nextErrors: Partial<
      Record<"email" | "password" | "givenName", string>
    > = {};

    if (!trimmedEmail) nextErrors.email = "Введите email.";
    if (!form.password.trim()) nextErrors.password = "Введите пароль.";
    if (!form.givenName.trim()) nextErrors.givenName = "Введите имя.";

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Введите корректный email адрес.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      const firstInvalidField = ["email", "password", "givenName"].find(
        (key) => nextErrors[key as keyof typeof nextErrors],
      );
      if (firstInvalidField === "email") emailRef.current?.focus();
      if (firstInvalidField === "password") passwordRef.current?.focus();
      if (firstInvalidField === "givenName") givenNameRef.current?.focus();
      setError("Исправьте ошибки в форме.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ ...form, email: trimmedEmail });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Ошибка при создании пользователя",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={modalOverlayClasses} onClick={onClose}>
      <div className={modalBoxClasses} onClick={(e) => e.stopPropagation()}>
        <h2 className="m-0 mb-5 text-lg font-bold">Добавить пользователя</h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <p className="text-destructive mb-3 text-sm" aria-live="polite">
              {error}
            </p>
          )}

          <div className={formFieldWrap}>
            <label htmlFor="add-user-email" className={formLabel}>
              Email *
            </label>
            <Input
              ref={emailRef}
              id="add-user-email"
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm((f) => ({ ...f, email: e.target.value }));
                setFormErrors((prev) => ({ ...prev, email: undefined }));
              }}
              className={formInput}
              placeholder="example@mail.com"
              autoComplete="email"
              aria-invalid={Boolean(formErrors.email)}
              aria-describedby={
                formErrors.email ? "add-user-email-error" : undefined
              }
            />
            {formErrors.email ? (
              <span
                id="add-user-email-error"
                className="text-destructive mt-1 text-xs"
              >
                {formErrors.email}
              </span>
            ) : null}
          </div>
          <div className={formFieldWrap}>
            <label htmlFor="add-user-password" className={formLabel}>
              Пароль *
            </label>
            <PasswordInput
              ref={passwordRef}
              id="add-user-password"
              value={form.password}
              onChange={(e) => {
                setForm((f) => ({ ...f, password: e.target.value }));
                setFormErrors((prev) => ({ ...prev, password: undefined }));
              }}
              className={formInput}
              autoComplete="new-password"
              aria-invalid={Boolean(formErrors.password)}
              aria-describedby={
                formErrors.password ? "add-user-password-error" : undefined
              }
            />
            {formErrors.password ? (
              <span
                id="add-user-password-error"
                className="text-destructive mt-1 text-xs"
              >
                {formErrors.password}
              </span>
            ) : null}
          </div>
          <div className={formFieldWrap}>
            <label htmlFor="add-user-given-name" className={formLabel}>
              Имя *
            </label>
            <Input
              ref={givenNameRef}
              id="add-user-given-name"
              type="text"
              value={form.givenName}
              onChange={(e) => {
                setForm((f) => ({ ...f, givenName: e.target.value }));
                setFormErrors((prev) => ({ ...prev, givenName: undefined }));
              }}
              className={formInput}
              aria-invalid={Boolean(formErrors.givenName)}
              aria-describedby={
                formErrors.givenName ? "add-user-given-name-error" : undefined
              }
            />
            {formErrors.givenName ? (
              <span
                id="add-user-given-name-error"
                className="text-destructive mt-1 text-xs"
              >
                {formErrors.givenName}
              </span>
            ) : null}
          </div>
          <div className={formFieldWrap}>
            <label htmlFor="add-user-family-name" className={formLabel}>
              Фамилия
            </label>
            <Input
              id="add-user-family-name"
              type="text"
              value={form.familyName}
              onChange={(e) =>
                setForm((f) => ({ ...f, familyName: e.target.value }))
              }
              className={formInput}
            />
          </div>
          <div className={formFieldWrap}>
            <label htmlFor="add-user-internal-extensions" className={formLabel}>
              Внутренние номера
            </label>
            <Input
              id="add-user-internal-extensions"
              type="text"
              value={form.internalExtensions}
              onChange={(e) =>
                setForm((f) => ({ ...f, internalExtensions: e.target.value }))
              }
              className={formInput}
              placeholder="101, 102 или admin, ovchinnikov_nikita (МегаФон)"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="add-user-mobile-phones" className={formLabel}>
              Мобильные номера
            </label>
            <Input
              id="add-user-mobile-phones"
              type="text"
              value={form.mobilePhones}
              onChange={(e) =>
                setForm((f) => ({ ...f, mobilePhones: e.target.value }))
              }
              className={formInput}
              placeholder="79XXXXXXXXX, можно несколько через запятую"
            />
          </div>

          {/* Telegram Отчеты */}
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="m-0 mb-3 text-sm font-bold">Telegram Отчеты</h3>
            <div className={formFieldWrap}>
              <label htmlFor="add-user-telegram-chat-id" className={formLabel}>
                Telegram Chat ID
              </label>
              <Input
                id="add-user-telegram-chat-id"
                type="text"
                value={form.telegramChatId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, telegramChatId: e.target.value }))
                }
                className={formInput}
                placeholder="ID чата пользователя"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Чтобы узнать ID, напишите боту.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.telegramDailyReport}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      telegramDailyReport: e.target.checked,
                    }))
                  }
                />
                Получать свои ежедневные отчеты
              </label>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.telegramManagerReport}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      telegramManagerReport: e.target.checked,
                    }))
                  }
                />
                Получать отчеты по всем менеджерам (для руководителей)
              </label>
            </div>
          </div>

          {/* MAX Отчеты */}
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="m-0 mb-3 text-sm font-bold">MAX Отчеты</h3>
            <div className={formFieldWrap}>
              <label htmlFor="add-user-max-chat-id" className={formLabel}>
                MAX Chat ID
              </label>
              <Input
                id="add-user-max-chat-id"
                type="text"
                value={form.maxChatId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxChatId: e.target.value }))
                }
                className={formInput}
                placeholder="ID чата MAX"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Заполняется автоматически при подключении
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.maxDailyReport}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxDailyReport: e.target.checked,
                    }))
                  }
                />
                Получать свои ежедневные отчеты (MAX)
              </label>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.maxManagerReport}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxManagerReport: e.target.checked,
                    }))
                  }
                />
                Получать отчеты по всем менеджерам (MAX)
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="link"
              onClick={onClose}
              className="text-foreground"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={submitting}
              aria-busy={submitting}
              aria-live="polite"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Добавить
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
