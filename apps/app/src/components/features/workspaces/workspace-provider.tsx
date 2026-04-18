"use client";

import { toast } from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from "react";
import { useSession } from "@/lib/better-auth";
import {
  clearActiveWorkspaceCookie,
  getActiveWorkspaceCookie,
  setActiveWorkspaceCookie,
  setOnboardedCookie,
} from "@/lib/cookies";
import { type orpc as orpcType, useORPC } from "@/orpc/react";

// Re-export для обратной совместимости
export { clearActiveWorkspaceCookie };

// Тип элемента workspaces из ответа API (inferred from orpc.workspaces.list)
type Workspace = Awaited<ReturnType<typeof orpcType.workspaces.list.queryFn>>["workspaces"][number];

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
  const pathname = usePathname();

  const isAuthenticated = !!session?.user;
  const shouldFetchWorkspaces = isAuthenticated && !sessionPending;

  const { data: workspacesData, isPending: workspacesPending } = useQuery({
    ...orpc.workspaces.list.queryOptions(),
    enabled: shouldFetchWorkspaces,
  });

  const setActiveMutation = useMutation(
    orpc.workspaces.setActive.mutationOptions({
      onMutate: async (variables) => {
        // Сохраняем текущее значение для rollback при ошибке
        const previousData = queryClient.getQueryData(orpc.workspaces.list.queryKey({}));

        // Оптимистично обновляем кэш
        queryClient.setQueryData(orpc.workspaces.list.queryKey({}), (old) => {
          if (!old || typeof old !== "object") return old;
          return {
            ...old,
            activeWorkspaceId: variables.workspaceId,
          };
        });

        setActiveWorkspaceCookie(variables.workspaceId);

        return { previousData };
      },
      onError: (_err, _variables, context) => {
        // Возвращаем предыдущее значение при ошибке
        if (context?.previousData) {
          queryClient.setQueryData(orpc.workspaces.list.queryKey({}), context.previousData);
        }
        toast.error("Не удалось переключить компанию. Повторите попытку.");
      },
      onSuccess: async () => {
        toast.success("Компания выбрана");
        // Инвалидируем все запросы при смене workspace
        await queryClient.invalidateQueries();
      },
    }),
  );

  const workspaces = useMemo(() => {
    const list = workspacesData?.workspaces ?? [];
    // Сортируем по роли (owner -> admin -> member), затем по имени для стабильности
    const sorted = [...list].sort((a, b) => {
      // Сначала owner, потом admin, потом member
      const roleOrder = { owner: 0, admin: 1, member: 2 };
      const roleA = roleOrder[a.role as keyof typeof roleOrder] ?? 3;
      const roleB = roleOrder[b.role as keyof typeof roleOrder] ?? 3;
      if (roleA !== roleB) return roleA - roleB;
      // Затем по имени для стабильности
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [workspacesData?.workspaces]);

  const activeWorkspaceId = workspacesData?.activeWorkspaceId ?? null;

  const activeWorkspace = useMemo(() => {
    if (!activeWorkspaceId) {
      return workspaces[0] ?? null;
    }

    const found = workspaces.find((w) => w.id === activeWorkspaceId);
    return found ?? workspaces[0] ?? null;
  }, [workspaces, activeWorkspaceId]);

  // Отдельный эффект для очистки cookie, если активный workspace не найден в списке
  useEffect(() => {
    if (activeWorkspaceId && workspaces.length > 0) {
      const found = workspaces.find((w) => w.id === activeWorkspaceId);
      if (!found) {
        clearActiveWorkspaceCookie();
      }
    }
  }, [activeWorkspaceId, workspaces]);

  const loading = sessionPending || (shouldFetchWorkspaces && workspacesPending);

  // Проверяем, находимся ли мы на странице создания workspace
  const isOnboardingCreateWorkspace = pathname?.startsWith("/onboarding/create-workspace") ?? false;

  useEffect(() => {
    // Не устанавливаем cookie на странице создания workspace, т.к. страница сама управляет этим
    if (isOnboardingCreateWorkspace) return;
    if (activeWorkspace) {
      // Проверяем, что cookie соответствует текущему workspace
      const cookieValue = getActiveWorkspaceCookie();
      if (cookieValue !== activeWorkspace.id) {
        setActiveWorkspaceCookie(activeWorkspace.id);
      }
      setOnboardedCookie(activeWorkspace.isOnboarded);
    }
  }, [activeWorkspace, isOnboardingCreateWorkspace]);

  const setActiveWorkspace = useCallback(
    async (workspaceId: string) => {
      if (activeWorkspace?.id === workspaceId) return;
      if (setActiveMutation.isPending) return;

      // Всегда обновляем список перед переключением для гарантии актуальности
      await queryClient.invalidateQueries({
        queryKey: orpc.workspaces.list.queryKey({}),
      });

      // Ждём обновления данных
      await queryClient.refetchQueries({
        queryKey: orpc.workspaces.list.queryKey({}),
      });

      // Получаем свежие данные из кэша
      const freshData = queryClient.getQueryData(
        orpc.workspaces.list.queryKey({}),
      ) as typeof workspacesData;
      const freshWorkspaces = freshData?.workspaces ?? [];
      const ws = freshWorkspaces.find((w) => w.id === workspaceId);

      if (!ws) {
        toast.error("Компания не найдена.");
        return;
      }

      await setActiveMutation.mutateAsync({ workspaceId });
    },
    [activeWorkspace?.id, setActiveMutation, queryClient, orpc.workspaces.list],
  );

  const refreshWorkspaces = useCallback(async () => {
    await queryClient.refetchQueries({
      queryKey: orpc.workspaces.list.queryKey({}),
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
