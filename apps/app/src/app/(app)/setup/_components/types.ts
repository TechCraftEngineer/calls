import type { ReactNode } from "react";

export type StepId = "provider" | "api" | "directory" | "import" | "company" | "evaluation";

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

// Re-export shared ModalProps to maintain compatibility
export type { ModalProps } from "@/components/features/setup";
