/**
 * Database schema exports - Main entry point for all database tables and types
 *
 * This file provides a centralized export point for all database schemas,
 * making it easy to import tables and types from a single location.
 */

// Legacy exports for backward compatibility
export * from "./auth";
// Export all table definitions
export { callEvaluations, calls, transcripts } from "./calls";
export { activityLog, prompts } from "./system";
// Export all TypeScript types
export type {
  ActivityLog,
  Call,
  CallEvaluation,
  NewActivityLog,
  NewCall,
  NewCallEvaluation,
  NewPrompt,
  NewTranscript,
  NewUser,
  NewWorkspace,
  NewWorkspaceMember,
  Prompt,
  Transcript,
  User,
  UserFilters,
  UserIntegrations,
  UserKpiSettings,
  UserReportSettings,
  Workspace,
  WorkspaceMember,
} from "./types";
export {
  userFilters,
  userIntegrations,
  userKpiSettings,
  userReportSettings,
  users,
} from "./users";
export {
  workspaceMemberRole,
  workspaceMembers,
  workspaces,
} from "./workspaces";
