// Re-export types from centralized shared components
export type { ModalProps, StepConfig as SetupStep } from "@/components/features/setup";
export { ApiModal } from "./api-modal";
export { CompanyModal } from "./company-modal";
export { DirectoryModal } from "./directory-modal";
export { PromptsModal } from "./prompts-modal";
export { ProviderModal } from "./provider-modal";

// Re-export StepId from types.ts (single source of truth)
export type { StepId } from "./types";
