import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SetupStep, StepId } from "./types";

interface SetupStepItemProps {
  step: SetupStep;
  index: number;
  isCompleted: boolean;
  isDisabled: boolean;
  onComplete: (stepId: StepId) => void;
  onOpenModal: (stepId: StepId) => void;
}

export function SetupStepItem({
  step,
  isCompleted,
  isDisabled,
  onComplete,
  onOpenModal,
}: SetupStepItemProps) {
  const router = useRouter();

  return (
    <div className={`border-b border-border last:border-0 ${isDisabled ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-8 p-4">
        {/* Content with Icon */}
        <div className="flex max-w-lg min-w-0 flex-1 items-center">
          {/* Icon */}
          <div className="mr-3 flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-primary/20 to-primary/30 p-px shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-gradient-to-b from-primary/10 to-primary/20 shadow-sm">
              <div className="text-primary">{step.icon}</div>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h3 className="font-medium text-foreground">{step.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground/75">{step.description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!isCompleted && !isDisabled && (
            <>
              {step.href ? (
                <button
                  type="button"
                  onClick={() => {
                    onComplete(step.id);
                    if (step.href) {
                      router.push(step.href);
                    }
                  }}
                  className="rounded-md bg-blue-100 px-3 py-1 text-sm text-blue-600 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900/75"
                >
                  {step.actionLabel}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenModal(step.id)}
                  className="rounded-md bg-blue-100 px-3 py-1 text-sm text-blue-600 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900/75"
                >
                  {step.actionLabel}
                </button>
              )}
            </>
          )}

          {/* Checkmark button */}
          {!isDisabled && (
            <button
              type="button"
              title={isCompleted ? "Completed" : "Mark Done"}
              onClick={() => !isCompleted && onComplete(step.id)}
              className={`flex size-6 items-center justify-center rounded-full transition-colors ${
                isCompleted
                  ? "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
                  : "bg-slate-100 text-slate-400 hover:bg-green-100 hover:text-green-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-green-900/50 dark:hover:text-green-400"
              }`}
              disabled={isCompleted}
            >
              <Check className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
