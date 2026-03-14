"use client";

import { paths } from "@calls/config";
import { Button } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AddUserModal from "@/components/features/users/add-user-modal";
import ChangePasswordModal from "@/components/features/users/change-password-modal";
import type {
  AddUserForm,
  ManagedUser,
  PasswordForm,
} from "@/components/features/users/types";
import UsersTable from "@/components/features/users/users-table";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { useToast } from "@/components/ui/toast";
import { getCurrentUser, type User } from "@/lib/auth";
import { useORPC } from "@/orpc/react";

export default function UsersPage() {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);

  const {
    data: users = [],
    isPending: loading,
    error: usersError,
  } = useQuery(orpc.users.list.queryOptions());

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user) {
        router.push(paths.auth.signin);
        return;
      }
      setCurrentUser(user);
    });
  }, [router]);

  useEffect(() => {
    if (
      usersError &&
      typeof usersError === "object" &&
      "code" in usersError &&
      (usersError as { code?: string }).code === "FORBIDDEN"
    ) {
      router.push(paths.forbidden);
    }
  }, [usersError, router]);

  const deleteMutation = useMutation(
    orpc.users.delete.mutationOptions({
      onSuccess: (_, variables) => {
        // Optimistic update: удаляем пользователя из кэша сразу
        queryClient.setQueryData(
          orpc.users.list.queryKey(),
          (old: ManagedUser[] | undefined) => {
            if (!old) return [];
            return old.filter((user) => String(user.id) !== variables.user_id);
          },
        );
        // Затем инвалидируем для синхронизации с сервером
        queryClient.invalidateQueries({
          queryKey: orpc.users.list.queryKey(),
        });
      },
      onError: (err) => {
        showToast(err.message || "Ошибка при удалении пользователя", "error");
      },
    }),
  );

  const createMutation = useMutation(
    orpc.users.create.mutationOptions({
      onSuccess: (newUser) => {
        // Optimistic update: добавляем нового пользователя в кэш
        queryClient.setQueryData(
          orpc.users.list.queryKey(),
          (old: ManagedUser[] | undefined) => {
            if (!old) return [newUser as ManagedUser];
            // Проверяем, что пользователь еще не в списке (защита от дубликатов)
            const exists = old.some(u => String(u.id) === String((newUser as ManagedUser).id));
            if (exists) return old;
            return [...old, newUser as ManagedUser];
          },
        );
        // Затем инвалидируем для синхронизации с сервером
        queryClient.invalidateQueries({
          queryKey: orpc.users.list.queryKey(),
        });
      },
      onError: (err) => {
        showToast(err.message || "Ошибка при создании пользователя", "error");
        // Rollback optimistic update при ошибке
        queryClient.invalidateQueries({
          queryKey: orpc.users.list.queryKey(),
        });
      },
    }),
  );

  const changePasswordMutation = useMutation(
    orpc.users.changePassword.mutationOptions({
      onError: (err) => {
        showToast(err.message || "Ошибка при смене пароля", "error");
      },
    }),
  );

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${username}?`))
      return;
    deleteMutation.mutate({ user_id: userId });
  };

  const handleAddSubmit = async (form: AddUserForm) => {
    await createMutation.mutateAsync({
      username: form.username.trim(),
      password: form.password,
      givenName: form.givenName.trim(),
      familyName: form.familyName.trim() || undefined,
      internalExtensions: form.internalExtensions.trim() || undefined,
      mobilePhones: form.mobilePhones.trim() || undefined,
    });
    setShowAddModal(false);
  };

  const handlePasswordSubmit = async (
    userId: string,
    form: PasswordForm,
  ) => {
    await changePasswordMutation.mutateAsync({
      user_id: userId,
      new_password: form.new_password,
      confirm_password: form.confirm_password,
    });
    setShowPasswordModal(false);
    setPasswordUser(null);
  };

  const activeUsersCount = (users as ManagedUser[]).filter((u) => u.id).length;

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
          users={(users ?? []) as ManagedUser[]}
          currentUser={currentUser}
          loading={loading}
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
          onSuccess={() =>
            queryClient.invalidateQueries({
              queryKey: orpc.users.list.queryKey(),
            })
          }
          onSubmit={handleAddSubmit}
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
