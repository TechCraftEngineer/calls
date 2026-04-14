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

  const updateSetupProgressMutation = useMutation(
    orpc.workspaces.updateSetupProgress.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.workspaces.getSetupProgress.queryKey(),
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
      setCompletedSteps(steps);
      if (activeWorkspace) {
        updateSetupProgressMutationRef.current.mutate({
          workspaceId: activeWorkspace.id,
          completedSteps: [...steps],
        });
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
  });

  useEffect(() => {
    // Don't overwrite local state while a save mutation is in flight
    if (updateSetupProgressMutationRef.current.isPending) return;

    if (setupProgressData?.completedSteps && Array.isArray(setupProgressData.completedSteps)) {
      const validSteps = setupProgressData.completedSteps.filter(
        (step): step is StepId => typeof step === "string" && step.length > 0,
      );
      setCompletedSteps((prev) => {
        // Merge: keep any locally-added steps that haven't been persisted yet
        const merged = new Set([...validSteps, ...prev]);
        return merged;
      });
    } else if (activeWorkspace) {
      setCompletedSteps(new Set());
    }
  }, [setupProgressData, activeWorkspace]);

  return {
    completedSteps,
    saveCompletedSteps,
  };
}
