/**
 * TypeScript type definitions for all database tables
 */

// Import all table definitions as types
import type { callEvaluations, calls, transcripts } from "./calls";
import type { activityLog, prompts } from "./system";
import type {
  userFilters,
  userIntegrations,
  userKpiSettings,
  userReportSettings,
  users,
} from "./users";
import type { workspaceMembers, workspaces } from "./workspaces";

// Calls domain types
export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;

export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;

export type CallEvaluation = typeof callEvaluations.$inferSelect;
export type NewCallEvaluation = typeof callEvaluations.$inferInsert;

// Users domain types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserIntegrations = typeof userIntegrations.$inferSelect;
export type UserFilters = typeof userFilters.$inferSelect;
export type UserReportSettings = typeof userReportSettings.$inferSelect;
export type UserKpiSettings = typeof userKpiSettings.$inferSelect;

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
