/**
 * Database schema exports - Main entry point for all database tables and types
 */

// Auth (Better Auth)
export type { Account, Session, User, Verification } from "./auth";
export { account, session, user, verification } from "./auth";

// Billing
export {
  type Invoice,
  invoices,
  type NewInvoice,
  type NewSubscription,
  type NewUsageMetric,
  type Subscription,
  subscriptionPlan,
  subscriptionStatus,
  subscriptions,
  type UsageMetric,
  usageMetrics,
} from "./billing";

// Calls
export { callEvaluations, calls, transcripts } from "./calls";

// Files
export type { FileType } from "./files";
export { FILE_TYPES, files } from "./files";
// System
export {
  type ActivityLog,
  type AuditLog,
  activityLog,
  auditLog,
  type FeatureFlag,
  featureFlags,
  type NewActivityLog,
  type NewAuditLog,
  type NewFeatureFlag,
  type NewPrompt,
  type Prompt,
  prompts,
} from "./system";

// Types (inferred from tables)
export type {
  Call,
  CallEvaluation,
  File,
  NewCall,
  NewCallEvaluation,
  NewFile,
  NewTranscript,
  NewUserPreferences,
  NewWorkspace,
  NewWorkspaceIntegration,
  NewWorkspaceMember,
  Transcript,
  UserPreferences,
  Workspace,
  WorkspaceIntegration,
  WorkspaceMember,
} from "./types";
// User
export {
  type FilterSettings,
  type KpiSettings,
  type NewUserWorkspaceSettings,
  type NotificationSettings,
  type ReportSettings,
  type UserWorkspaceSettings,
  userPreferences,
  userWorkspaceSettings,
} from "./user";

// Workspace
export {
  type FtpIntegrationConfig,
  INTEGRATION_TYPES,
  type IntegrationConfig,
  type IntegrationType,
  type Invitation,
  invitations,
  type NewInvitation,
  workspaceIntegrations,
  workspaceMemberRole,
  workspaceMembers,
  workspaces,
} from "./workspace";
