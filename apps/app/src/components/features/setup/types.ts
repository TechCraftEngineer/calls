import type { ReactNode } from "react";

export interface StepConfig {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  timeEstimate: string;
  actionLabel: string;
  skipLabel?: string;
  editLabel?: string;
  href?: string;
}

export interface ModalProps<T = void> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data?: T) => void;
}

export interface ProviderModalProps extends ModalProps<string | null> {
  // Provider modal can pass provider ID on completion
}
