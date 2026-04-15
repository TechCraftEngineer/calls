import { useEffect } from "react";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import type { SetupStep, StepId } from "../_components/types";

export function useAutoOpenModal(
  steps: SetupStep[],
  completedSteps: Set<StepId>,
  activeModal: StepId | null,
  setActiveModal: (modal: StepId | null) => void,
) {
  const { activeWorkspace, loading } = useWorkspace();

  useEffect(() => {
    if (!activeWorkspace || loading) return;

    // Find the first incomplete step
    const firstIncompleteIndex = steps.findIndex((step) => !completedSteps.has(step.id));

    if (firstIncompleteIndex >= 0) {
      const firstIncompleteStep = steps[firstIncompleteIndex];

      // If the first incomplete step doesn't have href, open its modal
      if (firstIncompleteStep && !firstIncompleteStep.href && !activeModal) {
        setActiveModal(firstIncompleteStep.id);
      }
    }
  }, [completedSteps, activeWorkspace, loading, activeModal, steps, setActiveModal]);
}
