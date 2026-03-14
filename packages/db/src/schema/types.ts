/**
 * TypeScript type definitions for all database tables
 */

// Import Better Auth types
import type { account, session, user, verification } from "./auth";
// Import all table definitions as types
import type { callEvaluations, calls, transcripts } from "./calls";
import type { activityLog, prompts } from "./system";
import type { userPreferences } from "./user-preferences";
import type { workspaceMembers, workspaces } from "./workspaces";

export type { File, NewFile } from "./files";

// Calls domain types
export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;

export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;

export type CallEvaluation = typeof callEvaluations.$inferSelect;
export type NewCallEvaluation = typeof callEvaluations.$inferInsert;

// Better Auth domain types
export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;

// System domain types
export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;

// Workspace domain types
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
