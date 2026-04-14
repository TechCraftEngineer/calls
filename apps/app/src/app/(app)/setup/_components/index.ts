// Re-export types from centralized shared components
export type { ModalProps, StepConfig as SetupStep } from "@/components/features/setup";
export { ApiModal } from "./api-modal";
export { CompanyModal } from "./company-modal";
export { ImportModal } from "./import-modal";
export { PromptsModal } from "./prompts-modal";
export { ProviderModal } from "./provider-modal";
export { SetupFinishCard } from "./setup-finish-card";
export { SetupHeader } from "./setup-header";
export { SetupStepsList } from "./setup-steps-list";

// Re-export StepId from types.ts (single source of truth)
export type { StepId } from "./types";
