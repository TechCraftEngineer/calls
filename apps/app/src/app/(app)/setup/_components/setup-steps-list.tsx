import { Card } from "@calls/ui";
import { SetupStepItem } from "./setup-step-item";
import type { SetupStep, StepId } from "./types";

interface SetupStepsListProps {
  steps: SetupStep[];
  completedSteps: Set<StepId>;
  completedCount: number;
  totalSteps: number;
  progressPercent: number;
  onCompleteStep: (stepId: StepId) => void;
  onOpenModal: (stepId: StepId) => void;
}

export function SetupStepsList({
  steps,
  completedSteps,
  completedCount,
  totalSteps,
  progressPercent,
  onCompleteStep,
  onOpenModal,
}: SetupStepsListProps) {
  return (
    <Card className="mb-6 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Завершите настройку</h2>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {completedCount} из {totalSteps} завершено
            </span>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      {steps.map((step, index) => {
        const isCompleted = completedSteps.has(step.id);
        const isPrevCompleted = index === 0 || completedSteps.has(steps[index - 1].id);
        const isDisabled = !isPrevCompleted && !isCompleted;

        return (
          <SetupStepItem
            key={step.id}
            step={step}
            index={index}
            isCompleted={isCompleted}
            isDisabled={isDisabled}
            onComplete={onCompleteStep}
            onOpenModal={onOpenModal}
          />
        );
      })}
    </Card>
  );
}
