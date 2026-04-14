import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { useORPC } from "@/orpc/react";
import type { StepId } from "../_components/types";

export function useAutoCompleteSteps(
  completedSteps: Set<StepId>,
  saveCompletedSteps: (steps: Set<StepId>) => void,
) {
  const orpc = useORPC();
  const { activeWorkspace, loading } = useWorkspace();

  // Check if API step is completed by checking if integrations are configured
  const { data: integrations } = useQuery({
    ...orpc.settings.getIntegrations.queryOptions(),
    enabled: !loading && !!activeWorkspace,
  });

  // Auto-mark API step as completed if integrations are configured
  useEffect(() => {
    if (!integrations) return;

    const hasPbxConfigured = integrations.megapbx?.enabled === true;

    if (hasPbxConfigured && !completedSteps.has("api")) {
      const newCompleted = new Set(completedSteps);
      newCompleted.add("api");
      saveCompletedSteps(newCompleted);
    }
  }, [integrations, completedSteps, saveCompletedSteps]);
}
