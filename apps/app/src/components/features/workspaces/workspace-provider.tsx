"use client";

import { paths } from "@calls/config";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useToast } from "@/components/ui/toast";
import { workspacesApi } from "@/lib/api-orpc";
import { useSession } from "@/lib/better-auth";

interface Workspace {
  id: string;
  name: string;
  slug: string;
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

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionPending } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [workspacesLoadedOk, setWorkspacesLoadedOk] = useState(false);
  const [switchingWorkspace, setSwitchingWorkspace] = useState<string | null>(
    null,
  );
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = !!session?.user;
  const { showToast } = useToast();

  const isAuthOrCreateWorkspace =
    pathname?.startsWith(paths.auth.root) ||
    pathname?.startsWith(paths.onboarding.root);

  const loadWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      setWorkspacesLoadedOk(false);
      const { workspaces: list, activeWorkspaceId } =
        await workspacesApi.list();
      setWorkspaces(list);
      setWorkspacesLoadedOk(true);

      // Активный воркспейс из БД (источник истины)
      const current =
        list.find((w) => w.id === activeWorkspaceId) || list[0] || null;

      if (current) {
        setActiveWorkspaceState(current);
        // Cookie нужна для серверных запросов (orpc context)
        const isSecure = window.location.protocol === "https:";
        const cookieString = `active_workspace_id=${current.id}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
        // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API has limited browser support
        document.cookie = cookieString;
      }
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const setActiveWorkspace = async (workspaceId: string) => {
    // Предотвращаем одновременные переключения
    if (switchingWorkspace) {
      return;
    }

    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) {
      showToast("Воркспейс не найден", "error");
      return;
    }

    // Если уже активный - ничего не делаем
    if (activeWorkspace?.id === workspaceId) {
      return;
    }

    try {
      setSwitchingWorkspace(workspaceId);

      // API сохраняет в БД
      await workspacesApi.setActive(workspaceId);

      // Обновляем состояние только после успешного API вызова
      setActiveWorkspaceState(ws);

      // Cookie для серверных запросов
      const isSecure = window.location.protocol === "https:";
      const cookieString = `active_workspace_id=${workspaceId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
      // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API has limited browser support
      document.cookie = cookieString;

      // Refresh router state
      router.refresh();

      showToast("Воркспейс успешно переключен", "success");
    } catch (error) {
      console.error("Failed to set active workspace:", error);
      showToast("Не удалось переключить воркспейс. Попробуйте снова.", "error");
    } finally {
      setSwitchingWorkspace(null);
    }
  };

  useEffect(() => {
    if (sessionPending) {
      setLoading(true);
      setWorkspacesLoadedOk(false);
      return;
    }
    if (!isAuthenticated) {
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      setWorkspacesLoadedOk(false);
      setLoading(false);
      return;
    }
    loadWorkspaces();
  }, [loadWorkspaces, isAuthenticated, sessionPending]);

  // Редирект на создание воркспейса только если API успешно вернул пустой список
  // (не редиректим при ошибке API — иначе цикл с create-workspace)
  useEffect(() => {
    if (
      isAuthenticated &&
      !sessionPending &&
      !loading &&
      workspacesLoadedOk &&
      workspaces.length === 0 &&
      !isAuthOrCreateWorkspace
    ) {
      router.replace(paths.onboarding.createWorkspace);
    }
  }, [
    isAuthenticated,
    sessionPending,
    loading,
    workspacesLoadedOk,
    workspaces.length,
    isAuthOrCreateWorkspace,
    router,
  ]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        loading,
        setActiveWorkspace,
        refreshWorkspaces: loadWorkspaces,
      }}
    >
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
