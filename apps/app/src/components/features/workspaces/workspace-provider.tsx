"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { workspacesApi } from "@/lib/api-orpc";
import { useSession } from "@/lib/better-auth";

interface Workspace {
  id: number;
  name: string;
  slug: string;
  role: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  setActiveWorkspace: (workspaceId: number) => Promise<void>;
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
  const router = useRouter();
  const isAuthenticated = !!session?.user;

  const getActiveIdFromCookie = useCallback(() => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/\bactive_workspace_id=([^;]+)/);
    if (!match || !match[1]) return null;

    const workspaceId = parseInt(match[1], 10);
    return Number.isNaN(workspaceId) || workspaceId <= 0 ? null : workspaceId;
  }, []);

  const loadWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      const list = await workspacesApi.list();
      setWorkspaces(list);

      const cookieValue = getActiveIdFromCookie();
      const current = list.find((w) => w.id === cookieValue) || list[0] || null;

      if (current) {
        setActiveWorkspaceState(current);
        if (current.id !== cookieValue) {
          const isSecure = window.location.protocol === "https:";
          const cookieString = `active_workspace_id=${current.id}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
          // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API has limited browser support
          document.cookie = cookieString;
        }
      }
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    } finally {
      setLoading(false);
    }
  }, [getActiveIdFromCookie]);

  const setActiveWorkspace = async (workspaceId: number) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (!ws) {
      console.error(`Workspace with ID ${workspaceId} not found`);
      return;
    }

    try {
      // Set optimistic state first
      setActiveWorkspaceState(ws);

      // Set cookie with security flags
      const isSecure = window.location.protocol === "https:";
      const cookieString = `active_workspace_id=${workspaceId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
      // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API has limited browser support
      document.cookie = cookieString;

      // Call API to set active workspace
      await workspacesApi.setActive(workspaceId);

      // Refresh router state
      router.refresh();

      // Reload page to ensure all stores are updated
      window.location.reload();
    } catch (error) {
      console.error("Failed to set active workspace:", error);
      // Revert state on error
      setActiveWorkspaceState(activeWorkspace);
      // Optionally show user feedback
      alert("Не удалось переключить воркспейс. Попробуйте снова.");
    }
  };

  useEffect(() => {
    if (sessionPending) {
      setLoading(true);
      return;
    }
    if (!isAuthenticated) {
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      setLoading(false);
      return;
    }
    loadWorkspaces();
  }, [loadWorkspaces, isAuthenticated, sessionPending]);

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
