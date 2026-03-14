"use client";

import { paths } from "@calls/config";
import { Button } from "@calls/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AddUserModal from "@/components/features/users/add-user-modal";
import ChangePasswordModal from "@/components/features/users/change-password-modal";
import EditUserModal from "@/components/features/users/edit-user-modal";
import type {
  AddUserForm,
  EditUserForm,
  ManagedUser,
  PasswordForm,
} from "@/components/features/users/types";
import UsersTable from "@/components/features/users/users-table";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import api from "@/lib/api";
import { getCurrentUser, type User } from "@/lib/auth";

export default function UsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);

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
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "FORBIDDEN"
      ) {
        router.push(paths.forbidden);
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

  const handleAddSubmit = async (form: AddUserForm) => {
    await api.users.create({
      username: form.username.trim(),
      password: form.password,
      givenName: form.givenName.trim(),
      familyName: form.familyName.trim() || undefined,
      internalExtensions: form.internalExtensions.trim() || undefined,
      mobilePhones: form.mobilePhones.trim() || undefined,
    });
    loadUsers();
  };

  const handleEditSubmit = async (userId: number, form: EditUserForm) => {
    await api.users.update({
      user_id: userId,
      data: {
        givenName: form.givenName.trim(),
        familyName: form.familyName.trim() || undefined,
        internalExtensions: form.internalExtensions.trim() || undefined,
        mobilePhones: form.mobilePhones.trim() || undefined,
        telegramChatId: form.telegramChatId.trim() || undefined,
        telegram_daily_report: form.telegram_daily_report,
        telegram_manager_report: form.telegram_manager_report,
        max_chat_id: form.max_chat_id.trim() || undefined,
        max_daily_report: form.max_daily_report,
        max_manager_report: form.max_manager_report,
        filter_exclude_answering_machine: form.filter_exclude_answering_machine,
        filter_min_duration: form.filter_min_duration ?? 0,
        filter_min_replicas: form.filter_min_replicas ?? 0,
        email: form.email.trim() || undefined,
        email_daily_report: form.email_daily_report,
        email_weekly_report: form.email_weekly_report,
        email_monthly_report: form.email_monthly_report,
        telegram_weekly_report: form.telegram_weekly_report,
        telegram_monthly_report: form.telegram_monthly_report,
        report_include_call_summaries: form.report_include_call_summaries,
        report_detailed: form.report_detailed,
        report_include_avg_value: form.report_include_avg_value,
        report_include_avg_rating: form.report_include_avg_rating,
        kpi_base_salary: form.kpi_base_salary || 0,
        kpi_target_bonus: form.kpi_target_bonus || 0,
        kpi_target_talk_time_minutes: form.kpi_target_talk_time_minutes || 0,
      },
    });
    loadUsers();
  };

  const handlePasswordSubmit = async (userId: number, form: PasswordForm) => {
    await api.users.changePassword({
      user_id: userId,
      new_password: form.new_password,
      confirm_password: form.confirm_password,
    });
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
            onClick={() => setShowAddModal(true)}
            className="bg-linear-to-br from-[#FF6B35] to-[#F7931E] text-white border-none rounded-lg py-3 px-6 text-sm font-bold flex items-center gap-2 shadow-[0_2px_8px_rgba(255,107,53,0.3)]"
          >
            <span className="text-lg">+</span> Добавить пользователя
          </Button>
        </header>

        <UsersTable
          users={users}
          currentUser={currentUser}
          loading={loading}
          onEdit={(u) => {
            setEditUser(u);
            setShowEditModal(true);
          }}
          onChangePassword={(u) => {
            setPasswordUser(u);
            setShowPasswordModal(true);
          }}
          onDelete={handleDelete}
        />
      </main>

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={loadUsers}
          onSubmit={handleAddSubmit}
        />
      )}

      {showEditModal && editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => {
            setShowEditModal(false);
            setEditUser(null);
          }}
          onSubmit={handleEditSubmit}
          onRefresh={loadUsers}
        />
      )}

      {showPasswordModal && passwordUser && (
        <ChangePasswordModal
          user={passwordUser}
          onClose={() => {
            setShowPasswordModal(false);
            setPasswordUser(null);
          }}
          onSubmit={handlePasswordSubmit}
        />
      )}
    </div>
  );
}
