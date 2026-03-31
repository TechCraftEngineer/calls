"use client";

import { paths } from "@calls/config";
import { Button, toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/features/users/confirm-dialog";
import type { WorkspaceMemberUser } from "@/components/features/users/types";
import UsersTable from "@/components/features/users/users-table";
import InviteUserModal from "@/components/features/workspaces/invite-user-modal";
import PendingInvitations from "@/components/features/workspaces/pending-invitations";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { useSession } from "@/lib/better-auth";
import { useORPC } from "@/orpc/react";

export default function UsersPage() {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user ?? null;
  const userLoading = sessionPending;

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{
    userId: string;
    email: string;
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

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: orpc.users.list.queryKey() });
    if (workspaceId) {
      queryClient.invalidateQueries({
        queryKey: orpc.workspaces.listInvitations.queryKey({
          input: { workspaceId },
        }),
      });
    }
  };

  useEffect(() => {
    if (!userLoading && !user) {
      router.push(paths.auth.signin);
    }
  }, [userLoading, user, router]);

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
        toast.error(err instanceof Error ? err.message : "Не удалось исключить участника");
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
        toast.error(err instanceof Error ? err.message : "Не удалось обновить роль");
      },
    }),
  );

  const createInvitationMutation = useMutation(
    orpc.workspaces.createInvitation.mutationOptions({
      onSuccess: () => {
        invalidateQueries();
        toast.success("Приглашение отправлено");
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Не удалось отправить приглашение");
      },
    }),
  );

  const createLinkInvitationMutation = useMutation(
    orpc.workspaces.createLinkInvitation.mutationOptions({
      onSuccess: () => {
        invalidateQueries();
        toast.success("Ссылка-приглашение создана");
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Не удалось создать ссылку-приглашение");
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
        toast.error(err instanceof Error ? err.message : "Не удалось отменить приглашение");
      },
    }),
  );

  const handleInviteSubmit = async (email: string, role: "admin" | "member") => {
    if (!workspaceId) throw new Error("Нет компании");
    return createInvitationMutation.mutateAsync({
      workspaceId,
      email,
      role,
    });
  };

  const handleCreateLinkInvitation = async (role: "admin" | "member") => {
    if (!workspaceId) throw new Error("Нет компании");
    return createLinkInvitationMutation.mutateAsync({
      workspaceId,
      role,
    });
  };

  const handleRemoveMember = (userId: string, email: string) => {
    setConfirmRemove({ userId, email });
  };

  const handleUpdateRole = (userId: string, role: "owner" | "admin" | "member") => {
    if (!workspaceId) return;
    updateRoleMutation.mutate({ workspaceId, userId, role });
  };

  const activeUsersCount = (users as WorkspaceMemberUser[]).filter((u) => u.id).length;

  return (
    <div className="app-container">
      <Sidebar />
      <Header user={user} />

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
              variant="default"
              size="touch"
              onClick={() => setShowInviteModal(true)}
              aria-label="Пригласить по email"
              className="shadow-md hover:shadow-lg"
            >
              <span className="text-lg" aria-hidden="true">
                +
              </span>{" "}
              Пригласить
            </Button>
          </div>
        </header>

        <UsersTable
          users={(users ?? []) as WorkspaceMemberUser[]}
          currentUser={user}
          currentUserRole={activeWorkspace?.role ?? null}
          loading={loading}
          onRemoveMember={handleRemoveMember}
          onUpdateRole={handleUpdateRole}
        />

        {Array.isArray(invitations) && invitations.length > 0 && (
          <PendingInvitations
            invitations={
              invitations as Array<{
                id: string;
                email: string | null;
                role: string;
                createdAt?: Date;
                expiresAt?: Date;
                pendingSettings?: unknown;
                invitationType?: "email" | "link";
              }>
            }
            onRevoke={(invitationId) => {
              if (workspaceId) {
                revokeInvitationMutation.mutate({
                  workspaceId,
                  invitationId,
                });
              }
            }}
            isRevoking={revokeInvitationMutation.isPending}
          />
        )}
      </main>

      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onSubmit={handleInviteSubmit}
          onCreateLink={handleCreateLinkInvitation}
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
        message={`Исключить ${confirmRemove?.email} из компании?`}
      />
    </div>
  );
}
