"use client";

import { useState } from "react";
import {
  formFieldWrap,
  formInput,
  formLabel,
  modalBoxClasses,
  modalOverlayClasses,
  type PasswordForm,
} from "./types";
import type { ManagedUser } from "./types";

interface ChangePasswordModalProps {
  user: ManagedUser;
  onClose: () => void;
  onSubmit: (userId: number, form: PasswordForm) => Promise<void>;
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
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.new_password) {
      setError("Введите новый пароль.");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setError("Пароли не совпадают.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(user.id, form);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка при смене пароля");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={modalOverlayClasses} onClick={onClose}>
      <div className={modalBoxClasses} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: 700 }}>
          Сменить пароль
        </h2>
        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#666" }}>
          Пользователь: {user.username}
        </p>
        <form onSubmit={handleSubmit}>
          {error && (
            <p style={{ color: "#c00", marginBottom: "12px", fontSize: "14px" }}>
              {error}
            </p>
          )}
          <div className={formFieldWrap}>
            <label className={formLabel}>Новый пароль *</label>
            <input
              type="password"
              value={form.new_password}
              onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))}
              className={formInput}
              autoComplete="new-password"
            />
          </div>
          <div className="mb-4">
            <label className={formLabel}>Подтверждение пароля *</label>
            <input
              type="password"
              value={form.confirm_password}
              onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))}
              className={formInput}
              autoComplete="new-password"
            />
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
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
                color: "white",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Сохранение…" : "Сменить пароль"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
