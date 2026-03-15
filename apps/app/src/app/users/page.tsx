"use client";

import { paths } from "@calls/config";
import { Button, Card, CardContent, toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ChangePasswordModal from "@/components/features/users/change-password-modal";
import { ConfirmDialog } from "@/components/features/users/confirm-dialog";
import type {
  ManagedUser,
  PasswordForm,
} from "@/components/features/users/types";
import UsersTable from "@/components/features/users/users-table";
import AddWorkspaceMemberModal from "@/components/features/workspaces/add-workspace-member-modal";
import InviteUserModal from "@/components/features/workspaces/invite-user-modal";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { getCurrentUser, type User } from "@/lib/auth";
import { useORPC } from "@/orpc/react";

function getInviteUrl(token: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/invite/${token}`;
  }
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";
  const origin = base.startsWith("http") ? base : `https://${base}`;
  return `${origin}/invite/${token}`;
}

export default function UsersPage() {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddExistingModal, setShowAddExistingModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{
    userId: string;
    username: string;
  } | null>(null);

  const workspaceId = activeWorkspace?.id ?? null;

  const {
    data: users = [],
    isPending: loading,
    error: usersError,
  } = useQuery(orpc.users.list.queryOptions());

  const { data: invitations = [] } = useQuery({
    ...orpc.workspaces.listInvitations.queryOptions({
      input: { workspaceId: workspaceId ?? "" },
    }),
    enabled: !!workspaceId,
  });

  const { data: usersAvailableToAdd = [], isPending: usersAvailableLoading } =
    useQuery({
      ...orpc.workspaces.listUsersAvailableToAdd.queryOptions({
        input: { workspaceId: workspaceId ?? "" },
      }),
      enabled: !!workspaceId && !!showAddExistingModal,
    });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: orpc.users.list.queryKey() });
    if (workspaceId) {
      queryClient.invalidateQueries({
        queryKey: orpc.workspaces.listInvitations.queryKey({
          input: { workspaceId },
        }),
      });
      queryClient.invalidateQueries({
        queryKey: orpc.workspaces.listUsersAvailableToAdd.queryKey({
          input: { workspaceId },
        }),
      });
    }
  };

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

  const removeMemberMutation = useMutation(
    orpc.workspaces.removeMember.mutationOptions({
      onSuccess: () => {
        invalidateQueries();
        toast.success("Участник исключён");
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Не удалось исключить участника",
        );
      },
    }),
  );

  const updateRoleMutation = useMutation(
    orpc.workspaces.updateMemberRole.mutationOptions({
      onSuccess: () => {
        invalidateQueries();
        toast.success("Роль обновлена");
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Не удалось обновить роль",
        );
      },
    }),
  );

  const createInvitationMutation = useMutation(
    orpc.workspaces.createInvitation.mutationOptions({
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Не удалось создать приглашение",
        );
      },
    }),
  );

  const revokeInvitationMutation = useMutation(
    orpc.workspaces.revokeInvitation.mutationOptions({
      onSuccess: () => {
        invalidateQueries();
        toast.success("Приглашение отменено");
      },
      onError: (err) => {
        toast.error(
          err instanceof Error
            ? err.message
            : "Не удалось отменить приглашение",
        );
      },
    }),
  );

  const addMemberMutation = useMutation(
    orpc.workspaces.addMember.mutationOptions({
      onSuccess: () => {
        invalidateQueries();
        toast.success("Участник добавлен");
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Не удалось добавить участника",
        );
      },
    }),
  );

  const changePasswordMutation = useMutation(
    orpc.users.changePassword.mutationOptions({
      onError: (err) => {
        toast.error(err.message || "Ошибка при смене пароля");
      },
      onSuccess: () => {
        toast.success("Пароль успешно изменен");
      },
    }),
  );

  const handleInviteSubmit = async (
    email: string,
    role: "admin" | "member",
  ) => {
    if (!workspaceId) throw new Error("Нет рабочего пространства");
    const result = await createInvitationMutation.mutateAsync({
      workspaceId,
      email,
      role,
    });
    return {
      token: result.token,
      inviteUrl: getInviteUrl(result.token),
      expiresAt: result.expiresAt,
    };
  };

  const handleAddExisting = async (
    userId: string,
    role: "owner" | "admin" | "member",
  ) => {
    if (!workspaceId) return;
    await addMemberMutation.mutateAsync({ workspaceId, userId, role });
    setShowAddExistingModal(false);
  };

  const handleRemoveMember = (userId: string, username: string) => {
    setConfirmRemove({ userId, username });
  };

  const handleUpdateRole = (
    userId: string,
    role: "owner" | "admin" | "member",
  ) => {
    if (!workspaceId) return;
    updateRoleMutation.mutate({ workspaceId, userId, role });
  };

  const handlePasswordSubmit = async (userId: string, form: PasswordForm) => {
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
            <h1 className="page-title">Участники и пользователи</h1>
            <p className="page-subtitle mt-2 text-sm text-[#999]">
              {activeWorkspace?.name} · {activeUsersCount} участников
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="touch"
              onClick={() => setShowAddExistingModal(true)}
              aria-label="Добавить существующего пользователя"
            >
              Добавить участника
            </Button>
            <Button
              variant="accent"
              size="touch"
              onClick={() => setShowInviteModal(true)}
              aria-label="Пригласить по email"
            >
              <span className="text-lg" aria-hidden="true">
                +
              </span>{" "}
              Пригласить
            </Button>
          </div>
        </header>

        <UsersTable
          users={(users ?? []) as ManagedUser[]}
          currentUser={currentUser}
          currentUserRole={activeWorkspace?.role ?? null}
          loading={loading}
          onChangePassword={(u) => {
            setPasswordUser(u);
            setShowPasswordModal(true);
          }}
          onRemoveMember={handleRemoveMember}
          onUpdateRole={handleUpdateRole}
        />

        {Array.isArray(invitations) && invitations.length > 0 && (
          <Card className="mt-8">
            <CardContent className="p-6">
              <h3 className="text-base font-semibold mb-4">
                Ожидают подтверждения
              </h3>
              <ul className="space-y-2">
                {(
                  invitations as { id: string; email: string; role: string }[]
                ).map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-[#555]">
                      {inv.email} ·{" "}
                      {inv.role === "admin" ? "Администратор" : "Участник"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/80"
                      onClick={() => {
                        if (workspaceId && confirm("Отменить приглашение?")) {
                          revokeInvitationMutation.mutate({
                            workspaceId,
                            invitationId: inv.id,
                          });
                        }
                      }}
                    >
                      Отменить
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>

      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onSubmit={handleInviteSubmit}
        />
      )}

      {showAddExistingModal && (
        <AddWorkspaceMemberModal
          users={
            (Array.isArray(usersAvailableToAdd) ? usersAvailableToAdd : []) as {
              id: string;
              name: string;
              email: string;
              username: string;
            }[]
          }
          existingMembers={(users as ManagedUser[]).map((u) => ({
            id: u.userId ?? u.id,
            name: String(u.name ?? u.username ?? ""),
            email: String(u.username ?? u.email ?? ""),
          }))}
          loading={usersAvailableLoading}
          onClose={() => setShowAddExistingModal(false)}
          onSubmit={handleAddExisting}
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

      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => {
          if (confirmRemove && workspaceId) {
            removeMemberMutation.mutate({
              workspaceId,
              userId: confirmRemove.userId,
            });
            setConfirmRemove(null);
          }
        }}
        title="Исключить участника?"
        message={`Исключить ${confirmRemove?.username} из рабочего пространства?`}
      />
    </div>
  );
}
