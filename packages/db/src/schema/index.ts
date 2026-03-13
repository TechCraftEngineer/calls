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
  NewWorkspace,
  NewWorkspaceMember,
  Prompt,
  Transcript,
  Workspace,
  WorkspaceMember,
} from "./types";
export {
  workspaceMemberRole,
  workspaceMembers,
  workspaces,
} from "./workspaces";
