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

  // Check if evaluation templates are configured
  const { data: evaluationTemplates } = useQuery({
    ...orpc.settings.getEvaluationTemplates.queryOptions(),
    enabled: !loading && !!activeWorkspace,
  });

  // Check if employees exist
  const { data: employees } = useQuery({
    ...orpc.settings.listPbxEmployees.queryOptions(),
    enabled: !loading && !!activeWorkspace,
  });

  // Check if calls have been imported
  const { data: callsData } = useQuery({
    ...orpc.calls.list.queryOptions({ page: 1, perPage: 1 }),
    enabled: !loading && !!activeWorkspace,
  });

  // Auto-complete steps based on available data
  useEffect(() => {
    if (!activeWorkspace || loading) return;

    const newCompleted = new Set(completedSteps);
    let hasChanges = false;

    // Step 1: Provider - auto-complete if integrations exist
    if (integrations?.megapbx && !completedSteps.has("provider")) {
      newCompleted.add("provider");
      hasChanges = true;
    }

    // Step 2: API - auto-complete if PBX is configured
    const hasPbxConfigured = integrations?.megapbx?.enabled === true;
    if (hasPbxConfigured && !completedSteps.has("api")) {
      newCompleted.add("api");
      hasChanges = true;
    }

    // Step 3: Directory - auto-complete if employees exist
    if (employees && employees.length > 0 && !completedSteps.has("directory")) {
      newCompleted.add("directory");
      hasChanges = true;
    }

    // Step 4: Import - auto-complete if calls exist
    if (callsData && callsData.totalItems > 0 && !completedSteps.has("import")) {
      newCompleted.add("import");
      hasChanges = true;
    }

    // Step 5: Company - auto-complete if workspace has name and description
    const hasCompanyInfo = activeWorkspace.name && activeWorkspace.description;
    if (hasCompanyInfo && !completedSteps.has("company")) {
      newCompleted.add("company");
      hasChanges = true;
    }

    // Step 6: Evaluation - auto-complete if templates are available (builtin always exist)
    if (
      evaluationTemplates &&
      evaluationTemplates.length > 0 &&
      !completedSteps.has("evaluation")
    ) {
      newCompleted.add("evaluation");
      hasChanges = true;
    }

    if (hasChanges) {
      saveCompletedSteps(newCompleted);
    }
  }, [
    integrations,
    evaluationTemplates,
    employees,
    callsData,
    activeWorkspace,
    loading,
    completedSteps,
    saveCompletedSteps,
  ]);
}
