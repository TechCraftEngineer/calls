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
  const isInitialLoadRef = useRef(true);

  const updateSetupProgressMutation = useMutation(
    orpc.workspaces.updateSetupProgress.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === "workspaces.getSetupProgress",
        });
      },
      onError: (error) => {
        console.error("[useSetupProgress] Failed to update progress:", error);
      },
    }),
  );

  const saveCompletedSteps = useCallback(
    (steps: Set<StepId>) => {
      setCompletedSteps((prev) => {
        const newSteps = Array.from(steps).filter((step) => !prev.has(step));

        // Отправляем только если есть новые шаги
        if (activeWorkspace && newSteps.length > 0) {
          // Отправляем только последний новый шаг (самый важный)
          const lastNewStep = newSteps[newSteps.length - 1];
          updateSetupProgressMutation.mutate({
            workspaceId: activeWorkspace.id,
            completedStep: lastNewStep,
          });
        }

        return steps;
      });
    },
    [activeWorkspace, updateSetupProgressMutation],
  );

  const { data: setupProgressData } = useQuery({
    ...orpc.workspaces.getSetupProgress.queryOptions({
      input: {
        workspaceId: activeWorkspace?.id ?? "",
      },
    }),
    enabled: !workspaceLoading && !!activeWorkspace,
    staleTime: 0,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (!activeWorkspace) return;

    const currentWorkspaceId = activeWorkspace.id;
    const hasWorkspaceChanged =
      prevWorkspaceIdRef.current !== null && prevWorkspaceIdRef.current !== currentWorkspaceId;

    if (hasWorkspaceChanged) {
      setCompletedSteps(new Set());
      isInitialLoadRef.current = true;
    }

    prevWorkspaceIdRef.current = currentWorkspaceId;
  }, [activeWorkspace]);

  useEffect(() => {
    if (updateSetupProgressMutation.isPending || !setupProgressData) return;

    const validSteps = Array.isArray(setupProgressData.completedSteps)
      ? setupProgressData.completedSteps.filter(
          (step): step is StepId => typeof step === "string" && step.length > 0,
        )
      : [];

    setCompletedSteps((prev) => {
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        return new Set(validSteps);
      }

      return new Set([...validSteps, ...prev]);
    });
  }, [setupProgressData, updateSetupProgressMutation.isPending]);

  return {
    completedSteps,
    saveCompletedSteps,
  };
}
