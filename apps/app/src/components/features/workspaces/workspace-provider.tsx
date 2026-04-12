"use client";

import { toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from "react";
import { useSession } from "@/lib/better-auth";
import {
  clearActiveWorkspaceCookie,
  setActiveWorkspaceCookie,
  setOnboardedCookie,
} from "@/lib/cookies";
import { useORPC } from "@/orpc/react";

// Re-export для обратной совместимости
export { clearActiveWorkspaceCookie };

interface Workspace {
  id: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  role: string;
  isOnboarded: boolean;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  setActiveWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionPending } = useSession();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = !!session?.user;
  const shouldFetchWorkspaces = isAuthenticated && !sessionPending;

  const { data: workspacesData, isPending: workspacesPending } = useQuery({
    ...orpc.workspaces.list.queryOptions(),
    enabled: shouldFetchWorkspaces,
  });

  const setActiveMutation = useMutation(
    orpc.workspaces.setActive.mutationOptions({
      onSuccess: (_, variables) => {
        setActiveWorkspaceCookie(variables.workspaceId);
        queryClient.invalidateQueries({
          queryKey: orpc.workspaces.list.queryKey(),
        });
        router.refresh();
        toast.success("Компания выбрана");
      },
      onError: () => {
        toast.error("Не удалось переключить компанию. Повторите попытку.");
      },
    }),
  );

  const workspaces = (workspacesData?.workspaces ?? []) as Workspace[];
  const activeWorkspaceId = workspacesData?.activeWorkspaceId ?? null;
  const activeWorkspace = useMemo(() => {
    if (!activeWorkspaceId) return workspaces[0] ?? null;
    return workspaces.find((w: Workspace) => w.id === activeWorkspaceId) ?? workspaces[0] ?? null;
  }, [workspaces, activeWorkspaceId]);

  const loading = sessionPending || (shouldFetchWorkspaces && workspacesPending);

  // Проверяем, находимся ли мы на странице создания workspace
  const isOnboardingCreateWorkspace = pathname?.startsWith("/onboarding/create-workspace") ?? false;

  useEffect(() => {
    // Не устанавливаем cookie на странице создания workspace, т.к. страница сама управляет этим
    if (isOnboardingCreateWorkspace) return;
    if (activeWorkspace) {
      setActiveWorkspaceCookie(activeWorkspace.id);
      setOnboardedCookie(activeWorkspace.isOnboarded);
    }
  }, [activeWorkspace, isOnboardingCreateWorkspace]);

  const setActiveWorkspace = useCallback(
    async (workspaceId: string) => {
      const ws = workspaces.find((w: Workspace) => w.id === workspaceId);
      if (!ws) {
        toast.error("Компания не найдена.");
        return;
      }
      if (activeWorkspace?.id === workspaceId) return;
      if (setActiveMutation.isPending) return;

      await setActiveMutation.mutateAsync({ workspaceId });
    },
    [workspaces, activeWorkspace?.id, setActiveMutation],
  );

  const refreshWorkspaces = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: orpc.workspaces.list.queryKey(),
    });
  }, [queryClient, orpc.workspaces.list]);

  const value = useMemo<WorkspaceContextType>(
    () => ({
      workspaces,
      activeWorkspace,
      loading,
      setActiveWorkspace,
      refreshWorkspaces,
    }),
    [workspaces, activeWorkspace, loading, setActiveWorkspace, refreshWorkspaces],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
