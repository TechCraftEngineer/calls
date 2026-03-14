"use client";

import { paths } from "@calls/config";
import { Button, Card, CardContent } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AddWorkspaceMemberModal from "@/components/features/workspaces/add-workspace-member-modal";
import WorkspaceGeneralForm from "@/components/features/workspaces/workspace-general-form";
import WorkspaceMembersTable from "@/components/features/workspaces/workspace-members-table";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import type { UserAvailableToAdd, WorkspaceMember } from "@/lib/api-orpc";
import { getCurrentUser, type User } from "@/lib/auth";
import { useORPC } from "@/orpc/react";

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const orpc = useORPC();
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const workspaceId = activeWorkspace?.id ?? null;
  const isWorkspaceAdmin =
    activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";
  const isOwner = activeWorkspace?.role === "owner";

  const { data: workspace } = useQuery({
    ...orpc.workspaces.get.queryOptions({
      input: { workspaceId: workspaceId ?? "" },
    }),
    enabled: !!workspaceId,
  });

  const {
    data: members = [],
    isPending: membersLoading,
    error: membersError,
  } = useQuery({
    ...orpc.workspaces.listMembers.queryOptions({
      input: { workspaceId: workspaceId ?? "" },
    }),
    enabled: !!workspaceId,
  });

  const { data: usersAvailableToAdd = [], isPending: usersAvailableLoading } =
    useQuery({
      ...orpc.workspaces.listUsersAvailableToAdd.queryOptions({
        input: { workspaceId: workspaceId ?? "" },
      }),
      enabled: !!workspaceId && !!showAddModal,
    });

  const invalidateWorkspaceQueries = () => {
    if (!workspaceId) return;
    queryClient.invalidateQueries({
      queryKey: orpc.workspaces.get.queryKey({
        input: { workspaceId },
      }),
    });
    queryClient.invalidateQueries({
      queryKey: orpc.workspaces.listMembers.queryKey({
        input: { workspaceId },
      }),
    });
    queryClient.invalidateQueries({
      queryKey: orpc.workspaces.listUsersAvailableToAdd.queryKey({
        input: { workspaceId },
      }),
    });
  };

  const updateMutation = useMutation(
    orpc.workspaces.update.mutationOptions({
      onSuccess: () => {
        refreshWorkspaces();
        invalidateWorkspaceQueries();
      },
    }),
  );

  const addMemberMutation = useMutation(
    orpc.workspaces.addMember.mutationOptions({
      onSuccess: invalidateWorkspaceQueries,
    }),
  );

  const removeMemberMutation = useMutation(
    orpc.workspaces.removeMember.mutationOptions({
      onSuccess: invalidateWorkspaceQueries,
    }),
  );

  const updateRoleMutation = useMutation(
    orpc.workspaces.updateMemberRole.mutationOptions({
      onSuccess: invalidateWorkspaceQueries,
    }),
  );

  const deleteMutation = useMutation(
    orpc.workspaces.delete.mutationOptions({
      onSuccess: async () => {
        await refreshWorkspaces();
        router.replace(paths.auth.createWorkspace);
      },
    }),
  );

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
      membersError &&
      typeof membersError === "object" &&
      "code" in membersError &&
      (membersError as { code?: string }).code === "FORBIDDEN"
    ) {
      router.push(paths.forbidden);
    }
  }, [membersError, router]);

  if (!activeWorkspace) {
    return (
      <div className="app-container">
        <Sidebar user={currentUser} />
        <Header user={currentUser} />
        <main className="main-content">
          <div className="text-center py-[100px]">Загрузка…</div>
        </main>
      </div>
    );
  }

  if (!isWorkspaceAdmin) {
    router.push(paths.forbidden);
    return null;
  }

  const handleSaveGeneral = async (data: { name: string; slug: string }) => {
    if (!workspaceId) return;
    await updateMutation.mutateAsync({
      workspaceId,
      name: data.name,
      slug: data.slug,
    });
  };

  const handleAddMember = async (
    userId: string,
    role: "owner" | "admin" | "member",
  ) => {
    if (!workspaceId) return;
    await addMemberMutation.mutateAsync({ workspaceId, userId, role });
    setShowAddModal(false);
  };

  const handleRemoveMember = (userId: string) => {
    if (!workspaceId) return;
    if (!confirm("Исключить участника из воркспейса?")) return;
    removeMemberMutation.mutate({ workspaceId, userId });
  };

  const handleUpdateRole = (
    userId: string,
    role: "owner" | "admin" | "member",
  ) => {
    if (!workspaceId) return;
    updateRoleMutation.mutate({ workspaceId, userId, role });
  };

  const handleDeleteWorkspace = () => {
    if (!workspaceId) return;
    if (
      !confirm(
        `Вы уверены, что хотите удалить воркспейс "${activeWorkspace.name}"? Это действие нельзя отменить.`,
      )
    )
      return;
    deleteMutation.mutate({ workspaceId });
  };

  const currentUserId = currentUser ? String(currentUser.id) : null;

  return (
    <div className="app-container">
      <Sidebar user={currentUser} />
      <Header user={currentUser} />

      <main className="main-content">
        <header className="page-header mb-8 flex justify-between items-start">
          <div>
            <h1 className="page-title">Настройки воркспейса</h1>
            <p className="page-subtitle mt-2 text-sm text-[#999]">
              {activeWorkspace.name}
            </p>
          </div>
          {isWorkspaceAdmin && (
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-br from-[#FF6B35] to-[#F7931E] text-white border-none rounded-lg py-3 px-6 text-sm font-bold flex items-center gap-2 shadow-[0_2px_8px_rgba(255,107,53,0.3)]"
            >
              <span className="text-lg">+</span> Добавить участника
            </Button>
          )}
        </header>

        {workspace ? (
          <WorkspaceGeneralForm
            name={(workspace as { name: string }).name}
            slug={(workspace as { slug: string }).slug}
            onSave={handleSaveGeneral}
            saving={updateMutation.isPending}
          />
        ) : null}

        <div className="mb-6">
          <h2 className="text-base font-bold mb-4">Участники</h2>
          <WorkspaceMembersTable
            members={
              (Array.isArray(members) ? members : []) as WorkspaceMember[]
            }
            currentUserId={currentUserId}
            currentUserRole={activeWorkspace.role}
            loading={membersLoading}
            onRemoveMember={handleRemoveMember}
            onUpdateRole={handleUpdateRole}
          />
        </div>

        {isOwner && (
          <Card className="card border-red-200 bg-red-50/50">
            <CardContent className="p-6">
              <h3 className="text-base font-bold text-red-800 mb-2">
                Опасная зона
              </h3>
              <p className="text-sm text-red-700 mb-4">
                Удаление воркспейса необратимо. Все данные (звонки, настройки,
                участники) будут удалены.
              </p>
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
                onClick={handleDeleteWorkspace}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Удаление…" : "Удалить воркспейс"}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {showAddModal && (
        <AddWorkspaceMemberModal
          users={
            (Array.isArray(usersAvailableToAdd)
              ? usersAvailableToAdd
              : []) as UserAvailableToAdd[]
          }
          loading={usersAvailableLoading}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddMember}
        />
      )}
    </div>
  );
}
