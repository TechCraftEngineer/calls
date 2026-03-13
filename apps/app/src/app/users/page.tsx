"use client";

import { paths } from "@calls/config";
import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@calls/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import api from "@/lib/api";
import { getCurrentUser, type User } from "@/lib/auth";

interface ManagedUser extends User {
  internalExtensions?: string;
  mobilePhones?: string;
  created_at?: string;
  givenName?: string;
  familyName?: string;
  telegramChatId?: string;
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

const modalOverlayClasses =
  "fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]";
const modalBoxClasses =
  "bg-white rounded-xl p-6 max-w-[440px] w-full max-h-[90vh] overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.2)]";
const formFieldWrap = "mb-3";
const formLabel = "block mb-1 text-[13px] font-semibold";
const formInput = "w-full py-2 px-3 border border-[#ddd] rounded-md box-border";

export default function UsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
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
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState("");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = useState({
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
        router.push(paths.auth.signin);
        return;
      }
      setCurrentUser(user);

      const list = await api.users.list();
      setUsers((Array.isArray(list) ? list : []) as ManagedUser[]);
    } catch (error: unknown) {
      // Убрали console.error для продакшена
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "FORBIDDEN"
      ) {
        alert("Доступ запрещен.");
        router.push(paths.dashboard.root);
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
    } catch (_error) {
      alert("Ошибка при удалении пользователя");
    }
  };

  const openAddModal = () => {
    setAddForm({
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
      !addForm.givenName.trim()
    ) {
      setAddError("Заполните логин, пароль и имя.");
      return;
    }
    setAddSubmitting(true);
    try {
      await api.users.create({
        username: addForm.username.trim(),
        password: addForm.password,
        givenName: addForm.givenName.trim(),
        familyName: addForm.familyName.trim() || undefined,
        internalExtensions: addForm.internalExtensions.trim() || undefined,
        mobilePhones: addForm.mobilePhones.trim() || undefined,
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
    });
    setEditError("");
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditError("");
    if (!editForm.givenName.trim()) {
      setEditError("Укажите имя.");
      return;
    }
    setEditSubmitting(true);
    try {
      await api.users.update({
        user_id: editUser.id,
        data: {
          givenName: editForm.givenName.trim(),
          familyName: editForm.familyName.trim() || undefined,
          internalExtensions: editForm.internalExtensions.trim() || undefined,
          mobilePhones: editForm.mobilePhones.trim() || undefined,
          telegramChatId: editForm.telegramChatId.trim() || undefined,
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
        <header className="page-header mb-6 flex justify-between items-start">
          <div>
            <h1 className="page-title">Управление пользователями</h1>
            <p className="page-subtitle mt-2 text-sm text-[#999]">
              Всего активных аккаунтов: {activeUsersCount}
            </p>
          </div>
          <Button
            onClick={openAddModal}
            className="bg-gradient-to-br from-[#FF6B35] to-[#F7931E] text-white border-none rounded-lg py-3 px-6 text-sm font-bold flex items-center gap-2 shadow-[0_2px_8px_rgba(255,107,53,0.3)]"
          >
            <span className="text-lg">+</span> Добавить пользователя
          </Button>
        </header>

        <Card className="card p-0! overflow-hidden">
          <CardContent className="p-0!">
            <Table className="op-table">
              <TableHeader>
                <TableRow className="border-none">
                  <TableHead>ID</TableHead>
                  <TableHead>ИМЯ ПОЛЬЗОВАТЕЛЯ</TableHead>
                  <TableHead>ИМЯ</TableHead>
                  <TableHead>ФАМИЛИЯ</TableHead>
                  <TableHead>ВНУТР. НОМЕРА</TableHead>
                  <TableHead>МОБИЛЬНЫЕ НОМЕРА</TableHead>
                  <TableHead>ДАТА СОЗДАНИЯ</TableHead>
                  <TableHead className="text-right">ДЕЙСТВИЯ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10">
                      Загрузка…
                    </TableCell>
                  </TableRow>
                ) : users.length > 0 ? (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-[#999] font-medium">
                        {u.id}
                      </TableCell>
                      <TableCell className="font-semibold text-[#333]">
                        {u.username}
                      </TableCell>
                      <TableCell className="text-[#555]">
                        {u.givenName || "—"}
                      </TableCell>
                      <TableCell className="text-[#555]">
                        {u.familyName || "—"}
                      </TableCell>
                      <TableCell className="text-[#555] font-medium">
                        {u.internalExtensions || "—"}
                      </TableCell>
                      <TableCell className="text-[#555] font-medium">
                        {u.mobilePhones || "—"}
                      </TableCell>
                      <TableCell className="text-[#555]">
                        {formatDate(u.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-3 justify-end items-center">
                          <Button
                            variant="outline"
                            className="ghost-btn h-8 text-xs px-4 bg-white border-[#DDD] text-[#333] font-semibold"
                            onClick={() => openEditModal(u)}
                          >
                            Редактировать
                          </Button>
                          <Button
                            variant="outline"
                            className="ghost-btn h-8 text-xs px-4 bg-white border-[#DDD] text-[#333] font-semibold"
                            onClick={() => openPasswordModal(u)}
                          >
                            Пароль
                          </Button>
                          <div className="w-20 flex justify-end items-center">
                            {currentUser?.id === u.id ? (
                              <span className="text-[11px] text-[#999] font-semibold uppercase tracking-wide">
                                ЭТО ВЫ
                              </span>
                            ) : (
                              <Button
                                variant="ghost"
                                className="h-8 text-xs p-0 bg-transparent border-none text-[#FF5252] font-semibold hover:opacity-70"
                                onClick={() => handleDelete(u.id, u.username)}
                              >
                                Удалить
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-10 text-[#999]"
                    >
                      Нет данных
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {showAddModal && (
        <div
          className={modalOverlayClasses}
          onClick={() => setShowAddModal(false)}
        >
          <div className={modalBoxClasses} onClick={(e) => e.stopPropagation()}>
            <h2 className="m-0 mb-5 text-lg font-bold">
              Добавить пользователя
            </h2>
            <form onSubmit={handleAddSubmit}>
              {addError && (
                <p className="text-[#c00] mb-3 text-sm">{addError}</p>
              )}
              <div className={formFieldWrap}>
                <label className={formLabel}>Логин *</label>
                <input
                  type="text"
                  value={addForm.username}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, username: e.target.value }))
                  }
                  className={formInput}
                  placeholder="example@mail.com"
                  autoComplete="username"
                />
              </div>
              <div className={formFieldWrap}>
                <label className={formLabel}>Пароль *</label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, password: e.target.value }))
                  }
                  className={formInput}
                  autoComplete="new-password"
                />
              </div>
              <div className={formFieldWrap}>
                <label className={formLabel}>Имя *</label>
                <input
                  type="text"
                  value={addForm.givenName}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, givenName: e.target.value }))
                  }
                  className={formInput}
                />
              </div>
              <div className={formFieldWrap}>
                <label className={formLabel}>Фамилия</label>
                <input
                  type="text"
                  value={addForm.familyName}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, familyName: e.target.value }))
                  }
                  className={formInput}
                />
              </div>
              <div className={formFieldWrap}>
                <label className={formLabel}>Внутренние номера</label>
                <input
                  type="text"
                  value={addForm.internalExtensions}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      internalExtensions: e.target.value,
                    }))
                  }
                  className={formInput}
                  placeholder="101, 102 или admin, ovchinnikov_nikita (МегаФон)"
                />
              </div>
              <div className="mb-4">
                <label className={formLabel}>Мобильные номера</label>
                <input
                  type="text"
                  value={addForm.mobilePhones}
                  onChange={(e) =>
                    setAddForm((f) => ({
                      ...f,
                      mobilePhones: e.target.value,
                    }))
                  }
                  className={formInput}
                  placeholder="79XXXXXXXXX, можно несколько через запятую"
                />
              </div>

              <div className="mb-4 p-4 bg-[#f5f7fa] rounded-lg">
                <h3 className="m-0 mb-3 text-sm font-bold">Telegram Отчеты</h3>
                <div className={formFieldWrap}>
                  <label className={formLabel}>Telegram Chat ID</label>
                  <input
                    type="text"
                    value={addForm.telegramChatId}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        telegramChatId: e.target.value,
                      }))
                    }
                    className={formInput}
                    placeholder="ID чата пользователя"
                  />
                  <p className="mt-1 text-[11px] text-[#666]">
                    Чтобы узнать ID, напишите боту.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-[13px] cursor-pointer">
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
                  <label className="flex items-center gap-2 text-[13px] cursor-pointer">
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

              <div className="mb-4 p-4 bg-[#f5f7fa] rounded-lg">
                <h3 className="m-0 mb-3 text-sm font-bold">MAX Отчеты</h3>
                <div className={formFieldWrap}>
                  <label className={formLabel}>MAX Chat ID</label>
                  <input
                    type="text"
                    value={addForm.max_chat_id}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, max_chat_id: e.target.value }))
                    }
                    className={formInput}
                    placeholder="ID чата MAX"
                  />
                  <p className="mt-1 text-[11px] text-[#666]">
                    Заполняется автоматически при подключении
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-[13px] cursor-pointer">
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
                  <label className="flex items-center gap-2 text-[13px] cursor-pointer">
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
                  className={
                    addSubmitting
                      ? "py-2 px-4 border-none rounded-md bg-[#ccc] text-white font-semibold cursor-not-allowed"
                      : "py-2 px-4 border-none rounded-md bg-gradient-to-br from-[#FF6B35] to-[#F7931E] text-white font-semibold cursor-pointer"
                  }
                >
                  {addSubmitting ? "Сохранение…" : "Добавить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editUser && (
        <div
          className={modalOverlayClasses}
          onClick={() => setShowEditModal(false)}
        >
          <div className={modalBoxClasses} onClick={(e) => e.stopPropagation()}>
            <h2 className="m-0 mb-5 text-lg font-bold">
              Редактировать пользователя
            </h2>
            <p className="m-0 mb-4 text-[13px] text-[#666]">
              Логин: {editUser.username}
            </p>
            <form onSubmit={handleEditSubmit}>
              {editError && (
                <p className="text-[#c00] mb-3 text-sm">{editError}</p>
              )}
              <div className={formFieldWrap}>
                <label className={formLabel}>Имя *</label>
                <input
                  type="text"
                  value={editForm.givenName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, givenName: e.target.value }))
                  }
                  className={formInput}
                />
              </div>
              <div className={formFieldWrap}>
                <label className={formLabel}>Фамилия</label>
                <input
                  type="text"
                  value={editForm.familyName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, familyName: e.target.value }))
                  }
                  className={formInput}
                />
              </div>
              <div className={formFieldWrap}>
                <label className={formLabel}>Внутренние номера</label>
                <input
                  type="text"
                  value={editForm.internalExtensions}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      internalExtensions: e.target.value,
                    }))
                  }
                  className={formInput}
                  placeholder="101, 102 или admin, ovchinnikov_nikita (МегаФон)"
                />
              </div>
              <div className="mb-4">
                <label className={formLabel}>Мобильные номера</label>
                <input
                  type="text"
                  value={editForm.mobilePhones}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      mobilePhones: e.target.value,
                    }))
                  }
                  className={formInput}
                  placeholder="79XXXXXXXXX, можно несколько через запятую"
                />
              </div>

              <div className={formFieldWrap}>
                <label className={formLabel}>Telegram Chat ID</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={editForm.telegramChatId}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        telegramChatId: e.target.value,
                      }))
                    }
                    className="flex-1 py-2 px-3 border border-[#ddd] rounded-md box-border"
                    placeholder="ID чата пользователя"
                  />
                </div>
                <div style={{ marginTop: "8px" }}>
                  {editUser.telegramChatId ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Отвязать Telegram аккаунт?")) return;
                        try {
                          await api.users.disconnectTelegram({
                            user_id: editUser.id,
                          });
                          setEditForm((f) => ({ ...f, telegramChatId: "" }));
                          setEditUser((u) =>
                            u ? { ...u, telegramChatId: "" } : null,
                          );
                          loadUsers();
                        } catch (_e) {
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
                          } catch (_e) {
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
                                telegramChatId: updated.telegramChatId || "",
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
                          } catch (_e) {
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
                        } catch (_e) {
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
                        } catch (_e) {
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
                    placeholder="otchet@mail.com"
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
          className={modalOverlayClasses}
          onClick={() => setShowPasswordModal(false)}
        >
          <div className={modalBoxClasses} onClick={(e) => e.stopPropagation()}>
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
              <div className={formFieldWrap}>
                <label className={formLabel}>Новый пароль *</label>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm((f) => ({
                      ...f,
                      new_password: e.target.value,
                    }))
                  }
                  className={formInput}
                  autoComplete="new-password"
                />
              </div>
              <div className="mb-4">
                <label className={formLabel}>Подтверждение пароля *</label>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm((f) => ({
                      ...f,
                      confirm_password: e.target.value,
                    }))
                  }
                  className={formInput}
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
