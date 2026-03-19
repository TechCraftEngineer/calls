"use client";

import { Button, Input, PasswordInput } from "@calls/ui";
import { Loader2 } from "lucide-react";
import { useState } from "react";
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
  onSubmit,
  onSuccess,
}: AddUserModalProps) {
  const [form, setForm] = useState<AddUserForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedEmail = form.email.trim().toLowerCase();
    if (!trimmedEmail || !form.password.trim() || !form.givenName.trim()) {
      setError("Заполните email, пароль и имя.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Введите корректный email адрес.");
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
          {error && <p className="text-destructive mb-3 text-sm">{error}</p>}

          <div className={formFieldWrap}>
            <label htmlFor="add-user-email" className={formLabel}>
              Email *
            </label>
            <Input
              id="add-user-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className={formInput}
              placeholder="example@mail.com"
              autoComplete="email"
            />
          </div>
          <div className={formFieldWrap}>
            <label htmlFor="add-user-password" className={formLabel}>
              Пароль *
            </label>
            <PasswordInput
              id="add-user-password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              className={formInput}
              autoComplete="new-password"
            />
          </div>
          <div className={formFieldWrap}>
            <label htmlFor="add-user-given-name" className={formLabel}>
              Имя *
            </label>
            <Input
              id="add-user-given-name"
              type="text"
              value={form.givenName}
              onChange={(e) =>
                setForm((f) => ({ ...f, givenName: e.target.value }))
              }
              className={formInput}
            />
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

          <div
            style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
          >
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
