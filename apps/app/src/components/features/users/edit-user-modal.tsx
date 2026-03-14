"use client";

import { Input } from "@calls/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useORPC } from "@/orpc/react";
import {
  type EditUserForm,
  formFieldWrap,
  formInput,
  formLabel,
  type ManagedUser,
  modalBoxClasses,
  modalOverlayClasses,
} from "./types";

interface EditUserModalProps {
  user: ManagedUser;
  onClose: () => void;
  onSubmit: (userId: string, form: EditUserForm) => Promise<void>;
  onRefresh: () => void;
}

function buildEditForm(u: ManagedUser): EditUserForm {
  return {
    givenName: u.givenName || "",
    familyName: u.familyName || "",
    internalExtensions: u.internalExtensions || "",
    mobilePhones: u.mobilePhones || "",
    telegramChatId: u.telegramChatId || "",
    telegram_daily_report: u.telegram_daily_report || false,
    telegram_manager_report: u.telegram_manager_report || false,
    max_chat_id: u.max_chat_id || "",
    max_daily_report: u.max_daily_report || false,
    max_manager_report: u.max_manager_report || false,
    filter_exclude_answering_machine:
      u.filter_exclude_answering_machine || false,
    filter_min_duration: u.filter_min_duration ?? 0,
    filter_min_replicas: u.filter_min_replicas ?? 0,
    email: u.email || "",
    email_daily_report: u.email_daily_report || false,
    email_weekly_report: u.email_weekly_report || false,
    email_monthly_report: u.email_monthly_report || false,
    telegram_weekly_report: u.telegram_weekly_report || false,
    telegram_monthly_report: u.telegram_monthly_report || false,
    report_include_call_summaries: u.report_include_call_summaries || false,
    report_detailed: u.report_detailed || false,
    report_include_avg_value: u.report_include_avg_value || false,
    report_include_avg_rating: u.report_include_avg_rating || false,
    kpi_base_salary: u.kpi_base_salary || 0,
    kpi_target_bonus: u.kpi_target_bonus || 0,
    kpi_target_talk_time_minutes: u.kpi_target_talk_time_minutes || 0,
  };
}

export default function EditUserModal({
  user,
  onClose,
  onSubmit,
  onRefresh,
}: EditUserModalProps) {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState<EditUserForm>(() => buildEditForm(user));
  const [editUser, setEditUser] = useState<ManagedUser>(user);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const disconnectTelegramMutation = useMutation(
    orpc.users.disconnectTelegram.mutationOptions({
      onSuccess: () => {
        setForm((f) => ({ ...f, telegramChatId: "" }));
        setEditUser((u) => ({ ...u, telegramChatId: "" }));
        onRefresh();
      },
      onError: () => showToast("Ошибка при отвязке Telegram", "error"),
    }),
  );

  const disconnectMaxMutation = useMutation(
    orpc.users.disconnectMax.mutationOptions({
      onSuccess: () => {
        setForm((f) => ({ ...f, max_chat_id: "" }));
        setEditUser((u) => ({ ...u, max_chat_id: "" }));
        onRefresh();
      },
      onError: () => showToast("Ошибка при отвязке MAX", "error"),
    }),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Валидация формы
    if (!form.givenName.trim()) {
      setError("Укажите имя.");
      return;
    }
    
    // Валидация email если указан
    if (form.email && form.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        setError("Укажите корректный email адрес.");
        return;
      }
    }
    
    // Валидация числовых полей
    if (form.filter_min_duration < 0) {
      setError("Минимальная длительность звонка не может быть отрицательной.");
      return;
    }
    
    if (form.filter_min_replicas < 0) {
      setError("Минимальное количество реплик не может быть отрицательным.");
      return;
    }
    
    setSubmitting(true);
    try {
      await onSubmit(String(editUser.id), form);
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Ошибка при сохранении";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const telegramAuthUrlMutation = useMutation(
    orpc.users.telegramAuthUrl.mutationOptions({
      onSuccess: (res) => {
        if (res.url) {
          window.open(res.url, "_blank");
        }
      },
      onError: () =>
        showToast("Ошибка при создании ссылки для Telegram", "error"),
    }),
  );

  const maxAuthUrlMutation = useMutation(
    orpc.users.maxAuthUrl.mutationOptions({
      onSuccess: (res) => {
        const url = "url" in res ? res.url : undefined;
        if (typeof url === "string") {
          window.open(url, "_blank");
        } else if (res.manual_instruction) {
          const cmd =
            res.manual_instruction.split(": ")[1] ?? res.manual_instruction;
          showToast(`Для подключения отправьте боту команду:\n${cmd}`, "info");
        }
      },
      onError: () => showToast("Ошибка при создании ссылки для MAX", "error"),
    }),
  );

  const handleDisconnectTelegram = useCallback(() => {
    if (!confirm("Отвязать Telegram аккаунт?")) return;
    disconnectTelegramMutation.mutate({ user_id: String(editUser.id) });
  }, [editUser.id, disconnectTelegramMutation]);

  const handleConnectTelegram = useCallback(() => {
    telegramAuthUrlMutation.mutate({ user_id: String(editUser.id) });
  }, [editUser.id, telegramAuthUrlMutation]);

  const handleCheckTelegramConnection = useCallback(async () => {
    try {
      const list = await queryClient.fetchQuery(orpc.users.list.queryOptions());
      const arr = (Array.isArray(list) ? list : []) as ManagedUser[];
      const updated = arr.find((u) => String(u.id) === String(editUser.id));
      if (updated) {
        setEditUser(updated);
        setForm((f) => ({
          ...f,
          telegramChatId: updated.telegramChatId || "",
          filter_exclude_answering_machine:
            updated.filter_exclude_answering_machine || false,
          filter_min_duration: updated.filter_min_duration ?? 0,
          filter_min_replicas: updated.filter_min_replicas ?? 0,
        }));
        onRefresh();
      }
    } catch (_e) {
      showToast("Ошибка при проверке подключения", "error");
    }
  }, [editUser.id, onRefresh, queryClient, orpc.users.list]);

  const handleDisconnectMax = useCallback(() => {
    if (!confirm("Отвязать MAX аккаунт?")) return;
    disconnectMaxMutation.mutate({ user_id: String(editUser.id) });
  }, [editUser.id, disconnectMaxMutation]);

  const handleConnectMax = useCallback(() => {
    maxAuthUrlMutation.mutate({ user_id: String(editUser.id) });
  }, [editUser.id, maxAuthUrlMutation]);

  return (
    <div className={modalOverlayClasses} onClick={onClose}>
      <div className={modalBoxClasses} onClick={(e) => e.stopPropagation()}>
        <h2 className="m-0 mb-5 text-lg font-bold">
          Редактировать пользователя
        </h2>
        <p className="m-0 mb-4 text-[13px] text-[#666]">
          Логин: {String(editUser.username ?? "")}
        </p>

        <form onSubmit={handleSubmit}>
          {error ? (
            <p className="text-[#c00] mb-3 text-sm">{String(error)}</p>
          ) : null}

          {/* Основные поля */}
          <div className={formFieldWrap}>
            <label className={formLabel}>Имя *</label>
            <Input
              type="text"
              value={form.givenName}
              onChange={(e) =>
                setForm((f) => ({ ...f, givenName: e.target.value }))
              }
              className={formInput}
            />
          </div>
          <div className={formFieldWrap}>
            <label className={formLabel}>Фамилия</label>
            <Input
              type="text"
              value={form.familyName}
              onChange={(e) =>
                setForm((f) => ({ ...f, familyName: e.target.value }))
              }
              className={formInput}
            />
          </div>
          <div className={formFieldWrap}>
            <label className={formLabel}>Внутренние номера</label>
            <Input
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
            <label className={formLabel}>Мобильные номера</label>
            <Input
              type="text"
              value={form.mobilePhones}
              onChange={(e) =>
                setForm((f) => ({ ...f, mobilePhones: e.target.value }))
              }
              className={formInput}
              placeholder="79XXXXXXXXX, можно несколько через запятую"
            />
          </div>

          {/* Telegram */}
          <div className={formFieldWrap}>
            <label className={formLabel}>Telegram Chat ID</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <Input
                type="text"
                value={form.telegramChatId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, telegramChatId: e.target.value }))
                }
                className="flex-1 py-2 px-3 border border-[#ddd] rounded-md box-border"
                placeholder="ID чата пользователя"
              />
            </div>
            <div style={{ marginTop: "8px" }}>
              {editUser.telegramChatId ? (
                <button
                  type="button"
                  onClick={handleDisconnectTelegram}
                  style={{
                    fontSize: "13px",
                    color: "#FF5252",
                    background: "none",
                    border: "1px solid #FF5252",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    cursor: "pointer",
                  }}
                >
                  Отвязать Telegram
                </button>
              ) : (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleConnectTelegram}
                    style={{
                      fontSize: "13px",
                      color: "#0088cc",
                      background: "none",
                      border: "1px solid #0088cc",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.48-.94-2.4-1.54-1.06-.7-.37-1.09.23-1.72.16-.16 2.87-2.63 2.92-2.85.01-.03.01-.14-.06-.2-.06-.05-.16-.03-.24-.01-.34.08-5.34 3.45-5.56 3.6-.32.22-.6.33-.85.33-.28-.01-.81-.26-1.2-.56-.48-.38-.86-.58-.82-1.23.02-.34.49-.69 1.28-1.05 5.03-2.18 8.38-3.62 10.04-4.3 2.8-1.16 3.38-1.36 3.76-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z" />
                    </svg>
                    Подключить Telegram
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckTelegramConnection}
                    style={{
                      fontSize: "13px",
                      color: "#666",
                      background: "none",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      cursor: "pointer",
                    }}
                  >
                    Проверить подключение
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* MAX Отчеты */}
          <div
            style={{
              marginBottom: "16px",
              padding: "16px",
              background: "#f5f7fa",
              borderRadius: "8px",
            }}
          >
            <h3
              style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}
            >
              MAX Отчеты
            </h3>
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                MAX Chat ID
              </label>
              <Input
                type="text"
                value={form.max_chat_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_chat_id: e.target.value }))
                }
                className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
                placeholder="ID чата MAX"
              />
            </div>
            <div style={{ marginBottom: "12px" }}>
              {editUser.max_chat_id ? (
                <button
                  type="button"
                  onClick={handleDisconnectMax}
                  style={{
                    fontSize: "13px",
                    color: "#FF5252",
                    background: "none",
                    border: "1px solid #FF5252",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    cursor: "pointer",
                  }}
                >
                  Отвязать MAX
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectMax}
                  style={{
                    fontSize: "13px",
                    color: "#6f42c1",
                    background: "none",
                    border: "1px solid #6f42c1",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>⚡</span> Подключить MAX
                </button>
              )}
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {(["max_daily_report", "max_manager_report"] as const).map(
                (key) => (
                  <label
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.checked }))
                      }
                    />
                    {key === "max_daily_report"
                      ? "Получать свои ежедневные отчеты (MAX)"
                      : "Получать отчеты по всем менеджерам (MAX)"}
                  </label>
                ),
              )}
            </div>
          </div>

          {/* Периодичность Telegram */}
          <div
            style={{
              marginBottom: "16px",
              padding: "16px",
              background: "#f5f7fa",
              borderRadius: "8px",
            }}
          >
            <h3
              style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}
            >
              Периодичность Telegram отчетов
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {(
                [
                  ["telegram_daily_report", "Ежедневный отчет"],
                  ["telegram_weekly_report", "Еженедельный отчет"],
                  ["telegram_monthly_report", "Ежемесячный отчет"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.checked }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Email Отчеты */}
          <div
            style={{
              marginBottom: "16px",
              padding: "16px",
              background: "#f5f7fa",
              borderRadius: "8px",
            }}
          >
            <h3
              style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}
            >
              Email Отчеты
            </h3>
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Email адрес
              </label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
                placeholder="otchet@mail.com"
              />
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {(
                [
                  ["email_daily_report", "Ежедневный отчет"],
                  ["email_weekly_report", "Еженедельный отчет"],
                  ["email_monthly_report", "Ежемесячный отчет"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.checked }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Параметры отчетов */}
          <div
            style={{
              marginBottom: "16px",
              padding: "16px",
              background: "#f5f7fa",
              borderRadius: "8px",
            }}
          >
            <h3
              style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}
            >
              Параметры отчетов
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {(
                [
                  ["report_detailed", "Подробный отчет (доп. метрики)"],
                  [
                    "report_include_call_summaries",
                    "Включать ИИ-саммари звонков (Email)",
                  ],
                  ["report_include_avg_value", "Средняя сумма сделки"],
                  ["report_include_avg_rating", "Средняя оценка качества"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.checked }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Настройки KPI */}
          <div
            style={{
              marginBottom: "16px",
              padding: "16px",
              background: "#f5f7fa",
              borderRadius: "8px",
            }}
          >
            <h3
              style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}
            >
              Настройки KPI
            </h3>
            {(
              [
                ["kpi_base_salary", "Базовый оклад (₽)"],
                ["kpi_target_bonus", "Целевой бонус (₽)"],
                [
                  "kpi_target_talk_time_minutes",
                  "Целевое время разговоров в месяц (мин)",
                ],
              ] as const
            ).map(([key, label]) => (
              <div key={key} style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  {label}
                </label>
                <Input
                  type="number"
                  value={form[key]}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setForm((f) => ({
                      ...f,
                      [key]: isNaN(value) ? 0 : Math.max(0, value),
                    }))
                  }}
                  className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
                />
              </div>
            ))}
          </div>

          {/* Исключить из отчётов */}
          <div
            style={{
              marginBottom: "16px",
              padding: "16px",
              background: "#f5f7fa",
              borderRadius: "8px",
            }}
          >
            <h3
              style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}
            >
              Исключить из отчётов
            </h3>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                cursor: "pointer",
                marginBottom: "12px",
              }}
            >
              <input
                type="checkbox"
                checked={form.filter_exclude_answering_machine}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    filter_exclude_answering_machine: e.target.checked,
                  }))
                }
              />
              Автоответчики
            </label>
            <div style={{ marginBottom: "8px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Звонки короче (сек)
              </label>
              <Input
                type="number"
                min={0}
                value={form.filter_min_duration ?? ""}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  setForm((f) => ({
                    ...f,
                    filter_min_duration: isNaN(value) ? 0 : Math.max(0, value),
                  }))
                }}
                className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
                placeholder="0 — не исключать"
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "4px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Меньше реплик
              </label>
              <Input
                type="number"
                min={0}
                value={form.filter_min_replicas ?? ""}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  setForm((f) => ({
                    ...f,
                    filter_min_replicas: isNaN(value) ? 0 : Math.max(0, value),
                  }))
                }}
                className="w-full py-2 px-3 border border-[#ddd] rounded-md box-border"
                placeholder="0 — не исключать"
              />
            </div>
          </div>

          <div
            style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
          >
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
              {submitting ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
