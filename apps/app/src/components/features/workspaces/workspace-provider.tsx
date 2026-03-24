"use client";

import { toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useSession } from "@/lib/better-auth";
import { useORPC } from "@/orpc/react";

interface Workspace {
  id: string;
  name: string;
  role: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  setActiveWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

function setActiveWorkspaceCookie(workspaceId: string) {
  if (typeof document === "undefined") return;
  const isSecure = window.location.protocol === "https:";
  const cookieString = `active_workspace_id=${workspaceId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API has limited browser support
  document.cookie = cookieString;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionPending } = useSession();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const router = useRouter();

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
        toast.success("Компания успешно выбрана");
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
    return (
      workspaces.find((w: Workspace) => w.id === activeWorkspaceId) ??
      workspaces[0] ??
      null
    );
  }, [workspaces, activeWorkspaceId]);

  const loading =
    sessionPending || (shouldFetchWorkspaces && workspacesPending);

  useEffect(() => {
    if (activeWorkspace) {
      setActiveWorkspaceCookie(activeWorkspace.id);
    }
  }, [activeWorkspace]);

  const setActiveWorkspace = useCallback(
    async (workspaceId: string) => {
      const ws = workspaces.find((w: Workspace) => w.id === workspaceId);
      if (!ws) {
        toast.error("Компания не найдена");
        return;
      }
      if (activeWorkspace?.id === workspaceId) return;
      if (setActiveMutation.isPending) return;

      setActiveMutation.mutate({ workspaceId });
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
    [
      workspaces,
      activeWorkspace,
      loading,
      setActiveWorkspace,
      refreshWorkspaces,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
