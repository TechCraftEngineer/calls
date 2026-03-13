/**
 * Database schema exports - Main entry point for all database tables and types
 *
 * This file provides a centralized export point for all database schemas,
 * making it easy to import tables and types from a single location.
 */

// Export all table definitions
export { callEvaluations, calls, transcripts } from "./calls";
export { activityLog, prompts } from "./system";
// Export Better Auth tables
export { user, session, account, verification } from "./auth";
export {
  workspaceMemberRole,
  workspaceMembers,
  workspaces,
} from "./workspaces";

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
  NewWorkspace,
  NewWorkspaceMember,
  Prompt,
  Transcript,
  Workspace,
  WorkspaceMember,
} from "./types";

// Export Better Auth types
export type {
  User,
  Session,
  Account,
  Verification,
} from "./auth";
