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

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data?: unknown) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProviderModalProps extends ModalProps {
  // Provider modal can pass provider ID on completion
}
