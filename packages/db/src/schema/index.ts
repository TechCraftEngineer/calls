/**
 * Database schema exports - Main entry point for all database tables and types
 *
 * This file provides a centralized export point for all database schemas,
 * making it easy to import tables and types from a single location.
 */

// Export Better Auth types
export type {
  Account,
  Session,
  User,
  Verification,
} from "./auth";
// Export Better Auth tables
export { account, session, user, verification } from "./auth";
// Export all table definitions
export { callEvaluations, calls, transcripts } from "./calls";
export type { FileType } from "./files";
export { FILE_TYPES, files } from "./files";
export { activityLog, prompts } from "./system";

// Export all TypeScript types
export type {
  ActivityLog,
  Call,
  CallEvaluation,
  File,
  NewActivityLog,
  NewCall,
  NewCallEvaluation,
  NewFile,
  NewPrompt,
  NewTranscript,
  NewUserPreferences,
  NewWorkspace,
  NewWorkspaceMember,
  Prompt,
  Transcript,
  UserPreferences,
  Workspace,
  WorkspaceMember,
} from "./types";
export {
  type NewUserFilterSettings,
  type UserFilterSettings,
  userFilterSettings,
} from "./user-filter-settings";
export {
  type NewUserKpiSettings,
  type UserKpiSettings,
  userKpiSettings,
} from "./user-kpi-settings";
export {
  type NewUserNotificationSettings,
  type UserNotificationSettings,
  userNotificationSettings,
} from "./user-notification-settings";
export { userPreferences } from "./user-preferences";
export {
  type NewUserReportSettings,
  type UserReportSettings,
  userReportSettings,
} from "./user-report-settings";
export {
  workspaceMemberRole,
  workspaceMembers,
  workspaces,
} from "./workspaces";
