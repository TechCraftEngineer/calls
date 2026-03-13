"use client";

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
  username: "",
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
};

export default function AddUserModal({
  onClose,
  onSubmit,
}: AddUserModalProps) {
  const [form, setForm] = useState<AddUserForm>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.username.trim() || !form.password.trim() || !form.givenName.trim()) {
      setError("Заполните логин, пароль и имя.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка при создании пользователя");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={modalOverlayClasses} onClick={onClose}>
      <div className={modalBoxClasses} onClick={(e) => e.stopPropagation()}>
        <h2 className="m-0 mb-5 text-lg font-bold">Добавить пользователя</h2>
        <form onSubmit={handleSubmit}>
          {error && <p className="text-[#c00] mb-3 text-sm">{error}</p>}

          <div className={formFieldWrap}>
            <label className={formLabel}>Логин *</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className={formInput}
              placeholder="example@mail.com"
              autoComplete="username"
            />
          </div>
          <div className={formFieldWrap}>
            <label className={formLabel}>Пароль *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={formInput}
              autoComplete="new-password"
            />
          </div>
          <div className={formFieldWrap}>
            <label className={formLabel}>Имя *</label>
            <input
              type="text"
              value={form.givenName}
              onChange={(e) => setForm((f) => ({ ...f, givenName: e.target.value }))}
              className={formInput}
            />
          </div>
          <div className={formFieldWrap}>
            <label className={formLabel}>Фамилия</label>
            <input
              type="text"
              value={form.familyName}
              onChange={(e) => setForm((f) => ({ ...f, familyName: e.target.value }))}
              className={formInput}
            />
          </div>
          <div className={formFieldWrap}>
            <label className={formLabel}>Внутренние номера</label>
            <input
              type="text"
              value={form.internalExtensions}
              onChange={(e) => setForm((f) => ({ ...f, internalExtensions: e.target.value }))}
              className={formInput}
              placeholder="101, 102 или admin, ovchinnikov_nikita (МегаФон)"
            />
          </div>
          <div className="mb-4">
            <label className={formLabel}>Мобильные номера</label>
            <input
              type="text"
              value={form.mobilePhones}
              onChange={(e) => setForm((f) => ({ ...f, mobilePhones: e.target.value }))}
              className={formInput}
              placeholder="79XXXXXXXXX, можно несколько через запятую"
            />
          </div>

          {/* Telegram Отчеты */}
          <div className="mb-4 p-4 bg-[#f5f7fa] rounded-lg">
            <h3 className="m-0 mb-3 text-sm font-bold">Telegram Отчеты</h3>
            <div className={formFieldWrap}>
              <label className={formLabel}>Telegram Chat ID</label>
              <input
                type="text"
                value={form.telegramChatId}
                onChange={(e) => setForm((f) => ({ ...f, telegramChatId: e.target.value }))}
                className={formInput}
                placeholder="ID чата пользователя"
              />
              <p className="mt-1 text-[11px] text-[#666]">Чтобы узнать ID, напишите боту.</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.telegram_daily_report}
                  onChange={(e) => setForm((f) => ({ ...f, telegram_daily_report: e.target.checked }))}
                />
                Получать свои ежедневные отчеты
              </label>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.telegram_manager_report}
                  onChange={(e) => setForm((f) => ({ ...f, telegram_manager_report: e.target.checked }))}
                />
                Получать отчеты по всем менеджерам (для руководителей)
              </label>
            </div>
          </div>

          {/* MAX Отчеты */}
          <div className="mb-4 p-4 bg-[#f5f7fa] rounded-lg">
            <h3 className="m-0 mb-3 text-sm font-bold">MAX Отчеты</h3>
            <div className={formFieldWrap}>
              <label className={formLabel}>MAX Chat ID</label>
              <input
                type="text"
                value={form.max_chat_id}
                onChange={(e) => setForm((f) => ({ ...f, max_chat_id: e.target.value }))}
                className={formInput}
                placeholder="ID чата MAX"
              />
              <p className="mt-1 text-[11px] text-[#666]">Заполняется автоматически при подключении</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.max_daily_report}
                  onChange={(e) => setForm((f) => ({ ...f, max_daily_report: e.target.checked }))}
                />
                Получать свои ежедневные отчеты (MAX)
              </label>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.max_manager_report}
                  onChange={(e) => setForm((f) => ({ ...f, max_manager_report: e.target.checked }))}
                />
                Получать отчеты по всем менеджерам (MAX)
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                background: "white",
                cursor: "pointer",
              }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={
                submitting
                  ? "py-2 px-4 border-none rounded-md bg-[#ccc] text-white font-semibold cursor-not-allowed"
                  : "py-2 px-4 border-none rounded-md bg-gradient-to-br from-[#FF6B35] to-[#F7931E] text-white font-semibold cursor-pointer"
              }
            >
              {submitting ? "Сохранение…" : "Добавить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
