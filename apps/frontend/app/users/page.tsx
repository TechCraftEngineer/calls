"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import api from "@/lib/api";
import { getCurrentUser, type User } from "@/lib/auth";

interface ManagedUser extends User {
  internal_numbers?: string;
  mobile_numbers?: string;
  created_at?: string;
  first_name?: string;
  last_name?: string;
  telegram_chat_id?: string;
  telegram_daily_report?: boolean;
  telegram_manager_report?: boolean;
  max_chat_id?: string;
  max_daily_report?: boolean;
  max_manager_report?: boolean;
  filter_exclude_answering_machine?: boolean;
  filter_min_duration?: number;
  filter_min_replicas?: number;
  email?: string;
  email_daily_report?: boolean;
  email_weekly_report?: boolean;
  email_monthly_report?: boolean;
  telegram_weekly_report?: boolean;
  telegram_monthly_report?: boolean;
  report_include_call_summaries?: boolean;
  report_detailed?: boolean;
  report_include_avg_value?: boolean;
  report_include_avg_rating?: boolean;
  kpi_base_salary?: number;
  kpi_target_bonus?: number;
  kpi_target_talk_time_minutes?: number;
}

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalBoxStyle: React.CSSProperties = {
  background: "white",
  borderRadius: "12px",
  padding: "24px",
  maxWidth: "440px",
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

export default function UsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    internal_numbers: "",
    mobile_numbers: "",
    telegram_chat_id: "",
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
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    internal_numbers: "",
    mobile_numbers: "",
    telegram_chat_id: "",
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
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    new_password: "",
    confirm_password: "",
  });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        router.push("/");
        return;
      }
      setCurrentUser(user);

      const list = await api.users.list();
      setUsers((Array.isArray(list) ? list : []) as ManagedUser[]);
    } catch (error: unknown) {
      console.error("Failed to load users:", error);
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "FORBIDDEN"
      ) {
        alert("Доступ запрещен.");
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async (userId: number, username: string) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${username}?`))
      return;
    try {
      await api.users.delete({ user_id: userId });
      loadUsers();
    } catch (error) {
      alert("Ошибка при удалении пользователя");
    }
  };

  const openAddModal = () => {
    setAddForm({
      username: "",
      password: "",
      first_name: "",
      last_name: "",
      internal_numbers: "",
      mobile_numbers: "",
      telegram_chat_id: "",
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
    });
    setAddError("");
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (
      !addForm.username.trim() ||
      !addForm.password.trim() ||
      !addForm.first_name.trim()
    ) {
      setAddError("Заполните логин, пароль и имя.");
      return;
    }
    setAddSubmitting(true);
    try {
      await api.users.create({
        username: addForm.username.trim(),
        password: addForm.password,
        first_name: addForm.first_name.trim(),
        last_name: addForm.last_name.trim() || undefined,
        internal_numbers: addForm.internal_numbers.trim() || undefined,
        mobile_numbers: addForm.mobile_numbers.trim() || undefined,
      });
      setShowAddModal(false);
      loadUsers();
    } catch (err: unknown) {
      setAddError(
        err instanceof Error ? err.message : "Ошибка при создании пользователя",
      );
    } finally {
      setAddSubmitting(false);
    }
  };

  const openEditModal = (u: ManagedUser) => {
    setEditUser(u);
    setEditForm({
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      internal_numbers: u.internal_numbers || "",
      mobile_numbers: u.mobile_numbers || "",
      telegram_chat_id: u.telegram_chat_id || "",
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
    });
    setEditError("");
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditError("");
    if (!editForm.first_name.trim()) {
      setEditError("Укажите имя.");
      return;
    }
    setEditSubmitting(true);
    try {
      await api.users.update({
        user_id: editUser.id,
        data: {
          first_name: editForm.first_name.trim(),
          last_name: editForm.last_name.trim() || undefined,
          internal_numbers: editForm.internal_numbers.trim() || undefined,
          mobile_numbers: editForm.mobile_numbers.trim() || undefined,
          telegram_chat_id: editForm.telegram_chat_id.trim() || undefined,
          telegram_daily_report: editForm.telegram_daily_report,
          telegram_manager_report: editForm.telegram_manager_report,
          max_chat_id: editForm.max_chat_id.trim() || undefined,
          max_daily_report: editForm.max_daily_report,
          max_manager_report: editForm.max_manager_report,
          filter_exclude_answering_machine:
            editForm.filter_exclude_answering_machine,
          filter_min_duration: editForm.filter_min_duration ?? 0,
          filter_min_replicas: editForm.filter_min_replicas ?? 0,
          email: editForm.email.trim() || undefined,
          email_daily_report: editForm.email_daily_report,
          email_weekly_report: editForm.email_weekly_report,
          email_monthly_report: editForm.email_monthly_report,
          telegram_weekly_report: editForm.telegram_weekly_report,
          telegram_monthly_report: editForm.telegram_monthly_report,
          report_include_call_summaries: editForm.report_include_call_summaries,
          report_detailed: editForm.report_detailed,
          report_include_avg_value: editForm.report_include_avg_value,
          report_include_avg_rating: editForm.report_include_avg_rating,
          kpi_base_salary: editForm.kpi_base_salary || 0,
          kpi_target_bonus: editForm.kpi_target_bonus || 0,
          kpi_target_talk_time_minutes:
            editForm.kpi_target_talk_time_minutes || 0,
        },
      });
      setShowEditModal(false);
      setEditUser(null);
      loadUsers();
    } catch (err: unknown) {
      setEditError(
        err instanceof Error ? err.message : "Ошибка при сохранении",
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const openPasswordModal = (u: ManagedUser) => {
    setPasswordUser(u);
    setPasswordForm({ new_password: "", confirm_password: "" });
    setPasswordError("");
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;
    setPasswordError("");
    if (!passwordForm.new_password) {
      setPasswordError("Введите новый пароль.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("Пароли не совпадают.");
      return;
    }
    setPasswordSubmitting(true);
    try {
      await api.users.changePassword({
        user_id: passwordUser.id,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
      });
      setShowPasswordModal(false);
      setPasswordUser(null);
    } catch (err: unknown) {
      setPasswordError(
        err instanceof Error ? err.message : "Ошибка при смене пароля",
      );
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch {
      return dateStr.substring(0, 10).replace(/-/g, ".");
    }
  };

  const activeUsersCount = users.filter((u) => u.id).length;

  return (
    <div className="app-container">
      <Sidebar user={currentUser} />
      <Header user={currentUser} />

      <main className="main-content">
        <header
          className="page-header"
          style={{
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h1 className="page-title">Управление пользователями</h1>
            <p
              className="page-subtitle"
              style={{ marginTop: "8px", fontSize: "14px", color: "#999" }}
            >
              Всего активных аккаунтов: {activeUsersCount}
            </p>
          </div>
          <button
            onClick={openAddModal}
            style={{
              background: "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 8px rgba(255, 107, 53, 0.3)",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "translateY(-1px)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.transform = "translateY(0)")
            }
          >
            <span style={{ fontSize: "18px" }}>+</span> Добавить пользователя
          </button>
        </header>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="op-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>ИМЯ ПОЛЬЗОВАТЕЛЯ</th>
                <th>ИМЯ</th>
                <th>ФАМИЛИЯ</th>
                <th>ВНУТР. НОМЕРА</th>
                <th>МОБИЛЬНЫЕ НОМЕРА</th>
                <th>ДАТА СОЗДАНИЯ</th>
                <th style={{ textAlign: "right" }}>ДЕЙСТВИЯ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    Загрузка...
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ color: "#999", fontWeight: 500 }}>{u.id}</td>
                    <td style={{ fontWeight: 600, color: "#333" }}>
                      {u.username}
                    </td>
                    <td style={{ color: "#555" }}>{u.first_name || "—"}</td>
                    <td style={{ color: "#555" }}>{u.last_name || "—"}</td>
                    <td style={{ color: "#555", fontWeight: 500 }}>
                      {u.internal_numbers || "—"}
                    </td>
                    <td style={{ color: "#555", fontWeight: 500 }}>
                      {u.mobile_numbers || "—"}
                    </td>
                    <td style={{ color: "#555" }}>
                      {formatDate(u.created_at)}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          justifyContent: "flex-end",
                          alignItems: "center",
                        }}
                      >
                        <button
                          className="ghost-btn"
                          style={{
                            height: "32px",
                            fontSize: "12px",
                            padding: "0 16px",
                            background: "white",
                            border: "1px solid #DDD",
                            color: "#333",
                            fontWeight: 600,
                          }}
                          onClick={() => openEditModal(u)}
                        >
                          Редактировать
                        </button>
                        <button
                          className="ghost-btn"
                          style={{
                            height: "32px",
                            fontSize: "12px",
                            padding: "0 16px",
                            background: "white",
                            border: "1px solid #DDD",
                            color: "#333",
                            fontWeight: 600,
                          }}
                          onClick={() => openPasswordModal(u)}
                        >
                          Пароль
                        </button>
                        <div
                          style={{
                            width: "80px",
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                          }}
                        >
                          {currentUser?.id === u.id ? (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#999",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                              }}
                            >
                              ЭТО ВЫ
                            </span>
                          ) : (
                            <button
                              style={{
                                height: "32px",
                                fontSize: "12px",
                                padding: "0",
                                background: "none",
                                border: "none",
                                color: "#FF5252",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "opacity 0.2s",
                              }}
                              onClick={() => handleDelete(u.id, u.username)}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.opacity = "0.7")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.opacity = "1")
                              }
                            >
                              Удалить
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#999",
                    }}
                  >
                    Нет данных
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {showAddModal && (
        <div style={modalOverlayStyle} onClick={() => setShowAddModal(false)}>
          <div style={modalBoxStyle} onClick={(e) => e.stopPropagation()}>
            <h2
              style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: 700 }}
            >
              Добавить пользователя
            </h2>
            <form onSubmit={handleAddSubmit}>
              {addError && (
                <p
                  style={{
                    color: "#c00",
                    marginBottom: "12px",
                    fontSize: "14px",
                  }}
                >
                  {addError}
                </p>
              )}
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Логин *
                </label>
                <input
                  type="text"
                  value={addForm.username}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, username: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                  placeholder="username@example.com"
                  autoComplete="username"
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Пароль *
                </label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, password: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                  autoComplete="new-password"
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Имя *
                </label>
                <input
                  type="text"
                  value={addForm.first_name}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, first_name: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Фамилия
                </label>
                <input
                  type="text"
                  value={addForm.last_name}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, last_name: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Внутренние номера
                </label>
                <input
                  type="text"
                  value={addForm.internal_numbers}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      internal_numbers: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                  placeholder="101, 102 или admin, ovchinnikov_nikita (МегаФон)"
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Мобильные номера
                </label>
                <input
                  type="text"
                  value={addForm.mobile_numbers}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      mobile_numbers: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                  placeholder="79XXXXXXXXX, можно несколько через запятую"
                />
              </div>

              <div
                style={{
                  marginBottom: "16px",
                  padding: "16px",
                  background: "#f5f7fa",
                  borderRadius: "8px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  Telegram Отчеты
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
                    Telegram Chat ID
                  </label>
                  <input
                    type="text"
                    value={addForm.telegram_chat_id}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        telegram_chat_id: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      boxSizing: "border-box",
                    }}
                    placeholder="ID чата пользователя"
                  />
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "11px",
                      color: "#666",
                    }}
                  >
                    Чтобы узнать ID, напишите боту.
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
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
                      checked={addForm.telegram_daily_report}
                      onChange={(e) =>
                        setAddForm((f) => ({
                          ...f,
                          telegram_daily_report: e.target.checked,
                        }))
                      }
                    />
                    Получать свои ежедневные отчеты
                  </label>
                  <label
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
                      checked={addForm.telegram_manager_report}
                      onChange={(e) =>
                        setAddForm((f) => ({
                          ...f,
                          telegram_manager_report: e.target.checked,
                        }))
                      }
                    />
                    Получать отчеты по всем менеджерам (для руководителей)
                  </label>
                </div>
              </div>

              <div
                style={{
                  marginBottom: "16px",
                  padding: "16px",
                  background: "#f5f7fa",
                  borderRadius: "8px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
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
                  <input
                    type="text"
                    value={addForm.max_chat_id}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, max_chat_id: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      boxSizing: "border-box",
                    }}
                    placeholder="ID чата MAX"
                  />
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "11px",
                      color: "#666",
                    }}
                  >
                    Заполняется автоматически при подключении
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
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
                      checked={addForm.max_daily_report}
                      onChange={(e) =>
                        setAddForm((f) => ({
                          ...f,
                          max_daily_report: e.target.checked,
                        }))
                      }
                    />
                    Получать свои ежедневные отчеты (MAX)
                  </label>
                  <label
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
                      checked={addForm.max_manager_report}
                      onChange={(e) =>
                        setAddForm((f) => ({
                          ...f,
                          max_manager_report: e.target.checked,
                        }))
                      }
                    />
                    Получать отчеты по всем менеджерам (MAX)
                  </label>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  disabled={addSubmitting}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "6px",
                    background:
                      "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
                    color: "white",
                    fontWeight: 600,
                    cursor: addSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {addSubmitting ? "Сохранение…" : "Добавить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editUser && (
        <div style={modalOverlayStyle} onClick={() => setShowEditModal(false)}>
          <div style={modalBoxStyle} onClick={(e) => e.stopPropagation()}>
            <h2
              style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: 700 }}
            >
              Редактировать пользователя
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#666" }}>
              Логин: {editUser.username}
            </p>
            <form onSubmit={handleEditSubmit}>
              {editError && (
                <p
                  style={{
                    color: "#c00",
                    marginBottom: "12px",
                    fontSize: "14px",
                  }}
                >
                  {editError}
                </p>
              )}
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Имя *
                </label>
                <input
                  type="text"
                  value={editForm.first_name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, first_name: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Фамилия
                </label>
                <input
                  type="text"
                  value={editForm.last_name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, last_name: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Внутренние номера
                </label>
                <input
                  type="text"
                  value={editForm.internal_numbers}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      internal_numbers: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                  placeholder="101, 102 или admin, ovchinnikov_nikita (МегаФон)"
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Мобильные номера
                </label>
                <input
                  type="text"
                  value={editForm.mobile_numbers}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      mobile_numbers: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                  placeholder="79XXXXXXXXX, можно несколько через запятую"
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Telegram Chat ID
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={editForm.telegram_chat_id}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        telegram_chat_id: e.target.value,
                      }))
                    }
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      boxSizing: "border-box",
                    }}
                    placeholder="ID чата пользователя"
                  />
                </div>
                <div style={{ marginTop: "8px" }}>
                  {editUser.telegram_chat_id ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Отвязать Telegram аккаунт?")) return;
                        try {
                          await api.users.disconnectTelegram({
                            user_id: editUser.id,
                          });
                          setEditForm((f) => ({ ...f, telegram_chat_id: "" }));
                          setEditUser((u) =>
                            u ? { ...u, telegram_chat_id: "" } : null,
                          );
                          loadUsers();
                        } catch (e) {
                          alert("Ошибка при отвязке Telegram");
                        }
                      }}
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
                    <div
                      style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                    >
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await api.users.telegramAuthUrl({
                              user_id: editUser.id,
                            });
                            if (res.url) {
                              window.open(res.url, "_blank");
                            }
                          } catch (e) {
                            alert("Ошибка при создании ссылки для Telegram");
                          }
                        }}
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
                        onClick={async () => {
                          if (!editUser) return;
                          try {
                            const list = await api.users.list();
                            const arr = (
                              Array.isArray(list) ? list : []
                            ) as ManagedUser[];
                            const updated = arr.find(
                              (u) => u.id === editUser.id,
                            );
                            if (updated) {
                              setEditUser(updated);
                              setEditForm((f) => ({
                                ...f,
                                telegram_chat_id:
                                  updated.telegram_chat_id || "",
                                filter_exclude_answering_machine:
                                  updated.filter_exclude_answering_machine ||
                                  false,
                                filter_min_duration:
                                  updated.filter_min_duration ?? 0,
                                filter_min_replicas:
                                  updated.filter_min_replicas ?? 0,
                              }));
                              loadUsers();
                            }
                          } catch (e) {
                            alert("Ошибка при проверке подключения");
                          }
                        }}
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

              <div
                style={{
                  marginBottom: "16px",
                  padding: "16px",
                  background: "#f5f7fa",
                  borderRadius: "8px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
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
                  <input
                    type="text"
                    value={editForm.max_chat_id}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        max_chat_id: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      boxSizing: "border-box",
                    }}
                    placeholder="ID чата MAX"
                  />
                </div>

                <div style={{ marginBottom: "12px" }}>
                  {editUser.max_chat_id ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Отвязать MAX аккаунт?")) return;
                        try {
                          await api.users.disconnectMax({
                            user_id: editUser.id,
                          });
                          setEditForm((f) => ({ ...f, max_chat_id: "" }));
                          setEditUser((u) =>
                            u ? { ...u, max_chat_id: "" } : null,
                          );
                          loadUsers();
                        } catch (e) {
                          alert("Ошибка при отвязке MAX");
                        }
                      }}
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
                      onClick={async () => {
                        try {
                          const res = await api.users.maxAuthUrl({
                            user_id: editUser.id,
                          });
                          if (res.url) {
                            window.open(res.url, "_blank");
                          } else if (res.manual_instruction) {
                            alert(
                              `Для подключения отправьте боту команду:\n${res.manual_instruction.split(": ")[1]}`,
                            );
                          }
                        } catch (e) {
                          alert("Ошибка при создании ссылки для MAX");
                        }
                      }}
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
                      <span style={{ fontSize: "16px" }}>⚡</span> Подключить
                      MAX
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
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
                      checked={editForm.max_daily_report}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          max_daily_report: e.target.checked,
                        }))
                      }
                    />
                    Получать свои ежедневные отчеты (MAX)
                  </label>
                  <label
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
                      checked={editForm.max_manager_report}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          max_manager_report: e.target.checked,
                        }))
                      }
                    />
                    Получать отчеты по всем менеджерам (MAX)
                  </label>
                </div>
              </div>

              <div
                style={{
                  marginBottom: "16px",
                  padding: "16px",
                  background: "#f5f7fa",
                  borderRadius: "8px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  Периодичность Telegram отчетов
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
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
                      checked={editForm.telegram_daily_report}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          telegram_daily_report: e.target.checked,
                        }))
                      }
                    />
                    Ежедневный отчет
                  </label>
                  <label
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
                      checked={editForm.telegram_weekly_report}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          telegram_weekly_report: e.target.checked,
                        }))
                      }
                    />
                    Еженедельный отчет
                  </label>
                  <label
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
                      checked={editForm.telegram_monthly_report}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          telegram_monthly_report: e.target.checked,
                        }))
                      }
                    />
                    Ежемесячный отчет
                  </label>
                </div>
              </div>

              <div
                style={{
                  marginBottom: "16px",
                  padding: "16px",
                  background: "#f5f7fa",
                  borderRadius: "8px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
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
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, email: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      boxSizing: "border-box",
                    }}
                    placeholder="report@example.com"
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
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
                      checked={editForm.email_daily_report}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          email_daily_report: e.target.checked,
                        }))
                      }
                    />
                    Ежедневный отчет
                  </label>
                  <label
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
                      checked={editForm.email_weekly_report}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          email_weekly_report: e.target.checked,
                        }))
                      }
                    />
                    Еженедельный отчет
                  </label>
                  <label
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
                      checked={editForm.email_monthly_report}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          email_monthly_report: e.target.checked,
                        }))
                      }
                    />
                    Ежемесячный отчет
                  </label>
                </div>
              </div>

              <div
                style={{
                  marginBottom: "16px",
                  padding: "16px",
                  background: "#f5f7fa",
                  borderRadius: "8px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  Параметры отчетов
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label
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
                      checked={editForm.report_detailed}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          report_detailed: e.target.checked,
                        }))
                      }
                    />
                    Подробный отчет (доп. метрики)
                  </label>
                  <label
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
                      checked={editForm.report_include_call_summaries}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          report_include_call_summaries: e.target.checked,
                        }))
                      }
                    />
                    Включать ИИ-саммари звонков (Email)
                  </label>
                  <label
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
                      checked={editForm.report_include_avg_value}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          report_include_avg_value: e.target.checked,
                        }))
                      }
                    />
                    Средняя сумма сделки
                  </label>
                  <label
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
                      checked={editForm.report_include_avg_rating}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          report_include_avg_rating: e.target.checked,
                        }))
                      }
                    />
                    Средняя оценка качества
                  </label>
                </div>
              </div>

              <div
                style={{
                  marginBottom: "16px",
                  padding: "16px",
                  background: "#f5f7fa",
                  borderRadius: "8px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  Настройки KPI
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
                    Базовый оклад (₽)
                  </label>
                  <input
                    type="number"
                    value={editForm.kpi_base_salary}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        kpi_base_salary: parseFloat(e.target.value) || 0,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    Целевой бонус (₽)
                  </label>
                  <input
                    type="number"
                    value={editForm.kpi_target_bonus}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        kpi_target_bonus: parseFloat(e.target.value) || 0,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    Целевое время разговоров в месяц (мин)
                  </label>
                  <input
                    type="number"
                    value={editForm.kpi_target_talk_time_minutes}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        kpi_target_talk_time_minutes:
                          parseFloat(e.target.value) || 0,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  marginBottom: "16px",
                  padding: "16px",
                  background: "#f5f7fa",
                  borderRadius: "8px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
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
                    checked={editForm.filter_exclude_answering_machine}
                    onChange={(e) =>
                      setEditForm((f) => ({
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
                  <input
                    type="number"
                    min={0}
                    value={editForm.filter_min_duration ?? ""}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        filter_min_duration: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      boxSizing: "border-box",
                    }}
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
                  <input
                    type="number"
                    min={0}
                    value={editForm.filter_min_replicas ?? ""}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        filter_min_replicas: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      boxSizing: "border-box",
                    }}
                    placeholder="0 — не исключать"
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
                  disabled={editSubmitting}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "6px",
                    background:
                      "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
                    color: "white",
                    fontWeight: 600,
                    cursor: editSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {editSubmitting ? "Сохранение…" : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && passwordUser && (
        <div
          style={modalOverlayStyle}
          onClick={() => setShowPasswordModal(false)}
        >
          <div style={modalBoxStyle} onClick={(e) => e.stopPropagation()}>
            <h2
              style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: 700 }}
            >
              Сменить пароль
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#666" }}>
              Пользователь: {passwordUser.username}
            </p>
            <form onSubmit={handlePasswordSubmit}>
              {passwordError && (
                <p
                  style={{
                    color: "#c00",
                    marginBottom: "12px",
                    fontSize: "14px",
                  }}
                >
                  {passwordError}
                </p>
              )}
              <div style={{ marginBottom: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Новый пароль *
                </label>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm((f) => ({
                      ...f,
                      new_password: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                  autoComplete="new-password"
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Подтверждение пароля *
                </label>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm((f) => ({
                      ...f,
                      confirm_password: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                  autoComplete="new-password"
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
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
                  disabled={passwordSubmitting}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "6px",
                    background:
                      "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
                    color: "white",
                    fontWeight: 600,
                    cursor: passwordSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {passwordSubmitting ? "Сохранение…" : "Сменить пароль"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
