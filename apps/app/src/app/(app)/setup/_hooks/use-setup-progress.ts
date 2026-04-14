import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { useORPC } from "@/orpc/react";
import type { StepId } from "../_components/types";

export function useSetupProgress() {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { activeWorkspace, loading: workspaceLoading } = useWorkspace();
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());
  const prevWorkspaceIdRef = useRef<string | null>(null);

  const updateSetupProgressMutation = useMutation(
    orpc.workspaces.updateSetupProgress.mutationOptions({
      onSuccess: () => {
        // Инвалидируем все getSetupProgress queries без указания конкретного workspaceId
        queryClient.invalidateQueries({
          queryKey: ["workspaces", "getSetupProgress"],
        });
      },
    }),
  );

  const updateSetupProgressMutationRef = useRef(updateSetupProgressMutation);

  useEffect(() => {
    updateSetupProgressMutationRef.current = updateSetupProgressMutation;
  }, [updateSetupProgressMutation]);

  const saveCompletedSteps = useCallback(
    (steps: Set<StepId>) => {
      console.log("[useSetupProgress] Saving steps:", Array.from(steps));
      setCompletedSteps(steps);
      if (activeWorkspace) {
        console.log("[useSetupProgress] Mutating to DB for workspace:", activeWorkspace.id);
        updateSetupProgressMutationRef.current.mutate({
          workspaceId: activeWorkspace.id,
          completedSteps: [...steps],
        });
      } else {
        console.log("[useSetupProgress] No active workspace, skipping save");
      }
    },
    [activeWorkspace],
  );

  // Load completed steps from database
  const { data: setupProgressData } = useQuery({
    ...orpc.workspaces.getSetupProgress.queryOptions({
      input: {
        workspaceId: activeWorkspace?.id ?? "",
      },
    }),
    enabled: !workspaceLoading && !!activeWorkspace,
    staleTime: 0, // Всегда считать данные устаревшими
    refetchOnMount: true, // Всегда перезапрашивать при монтировании
  });

  // Сбрасываем прогресс при смене компании
  useEffect(() => {
    if (!activeWorkspace) return;

    const currentWorkspaceId = activeWorkspace.id;
    const hasWorkspaceChanged =
      prevWorkspaceIdRef.current !== null && prevWorkspaceIdRef.current !== currentWorkspaceId;

    if (hasWorkspaceChanged) {
      console.log("[useSetupProgress] Workspace changed, resetting progress");
      setCompletedSteps(new Set());
    }

    prevWorkspaceIdRef.current = currentWorkspaceId;
  }, [activeWorkspace]);

  useEffect(() => {
    // Don't overwrite local state while a save mutation is in flight
    if (updateSetupProgressMutationRef.current.isPending) return;

    if (!setupProgressData) return;

    console.log("[useSetupProgress] Loading from DB:", setupProgressData);

    if (setupProgressData.completedSteps && Array.isArray(setupProgressData.completedSteps)) {
      const validSteps = setupProgressData.completedSteps.filter(
        (step): step is StepId => typeof step === "string" && step.length > 0,
      );

      console.log("[useSetupProgress] Valid steps from DB:", validSteps);

      // При первой загрузке (prev пустой) — просто устанавливаем данные из БД
      // При последующих обновлениях — мержим с локальными изменениями
      setCompletedSteps((prev) => {
        console.log("[useSetupProgress] Current local state:", Array.from(prev));
        // Если локальное состояние пустое — это первая загрузка, просто берём данные из БД
        if (prev.size === 0) {
          console.log("[useSetupProgress] First load, setting from DB");
          return new Set(validSteps);
        }
        // Иначе мержим: приоритет у данных из БД, но сохраняем локальные добавления
        const merged = new Set([...validSteps, ...prev]);
        console.log("[useSetupProgress] Merging, result:", Array.from(merged));
        return merged;
      });
    } else {
      console.log("[useSetupProgress] No valid steps, resetting to empty");
      // Если completedSteps не массив или пустой — устанавливаем пустой Set
      setCompletedSteps(new Set());
    }
  }, [setupProgressData]);

  return {
    completedSteps,
    saveCompletedSteps,
  };
}
