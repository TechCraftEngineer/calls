import type { ReactNode } from "react";

export type StepId = "provider" | "api" | "directory" | "company" | "prompts";

export interface SetupStep {
  id: StepId;
  title: string;
  description: string;
  icon: ReactNode;
  timeEstimate: string;
  actionLabel: string;
  skipLabel?: string;
  editLabel?: string;
  href?: string;
}

export interface ModalProps {
  open: boolean;
  onOpenChange: () => void;
  onComplete: () => void;
}
