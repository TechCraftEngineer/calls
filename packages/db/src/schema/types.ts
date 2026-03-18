/**
 * TypeScript type definitions for all database tables
 */

import type { account, session, user, verification } from "./auth";
import type { callEvaluations, calls, transcripts } from "./calls";
import type { userPreferences } from "./user/preferences";
import type {
  workspaceIntegrations,
  workspaceMembers,
  workspacePbxEmployees,
  workspacePbxLinks,
  workspacePbxNumbers,
  workspacePbxSyncState,
  workspacePbxWebhookEvents,
  workspaces,
} from "./workspace";

export type { File, NewFile } from "./files/files";

// Calls
export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;
export type CallEvaluation = typeof callEvaluations.$inferSelect;
export type NewCallEvaluation = typeof callEvaluations.$inferInsert;

// Auth
export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;

// Workspace
export type WorkspaceIntegration = typeof workspaceIntegrations.$inferSelect;
export type NewWorkspaceIntegration = typeof workspaceIntegrations.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type WorkspacePbxEmployee = typeof workspacePbxEmployees.$inferSelect;
export type NewWorkspacePbxEmployee = typeof workspacePbxEmployees.$inferInsert;
export type WorkspacePbxNumber = typeof workspacePbxNumbers.$inferSelect;
export type NewWorkspacePbxNumber = typeof workspacePbxNumbers.$inferInsert;
export type WorkspacePbxLink = typeof workspacePbxLinks.$inferSelect;
export type NewWorkspacePbxLink = typeof workspacePbxLinks.$inferInsert;
export type WorkspacePbxSyncState = typeof workspacePbxSyncState.$inferSelect;
export type NewWorkspacePbxSyncState =
  typeof workspacePbxSyncState.$inferInsert;
export type WorkspacePbxWebhookEvent =
  typeof workspacePbxWebhookEvents.$inferSelect;
export type NewWorkspacePbxWebhookEvent =
  typeof workspacePbxWebhookEvents.$inferInsert;
export type WorkspaceMegaPbxEmployee = WorkspacePbxEmployee;
export type NewWorkspaceMegaPbxEmployee = NewWorkspacePbxEmployee;
export type WorkspaceMegaPbxNumber = WorkspacePbxNumber;
export type NewWorkspaceMegaPbxNumber = NewWorkspacePbxNumber;
export type WorkspaceMegaPbxLink = WorkspacePbxLink;
export type NewWorkspaceMegaPbxLink = NewWorkspacePbxLink;
export type WorkspaceMegaPbxSyncState = WorkspacePbxSyncState;
export type NewWorkspaceMegaPbxSyncState = NewWorkspacePbxSyncState;
export type WorkspaceMegaPbxWebhookEvent = WorkspacePbxWebhookEvent;
export type NewWorkspaceMegaPbxWebhookEvent = NewWorkspacePbxWebhookEvent;

// User
export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
