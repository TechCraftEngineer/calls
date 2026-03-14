/**
 * Database schema exports - Main entry point for all database tables and types
 *
 * This file provides a centralized export point for all database schemas,
 * making it easy to import tables and types from a single location.
 */

// Export new SaaS tables
export {
  type AuditLog,
  auditLog,
  type NewAuditLog,
} from "./audit-log";
// Export Better Auth types
export type { Account, Session, User, Verification } from "./auth";
// Export Better Auth tables
export { account, session, user, verification } from "./auth";
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
// Export all table definitions
export { callEvaluations, calls, transcripts } from "./calls";
export {
  type FeatureFlag,
  featureFlags,
  type NewFeatureFlag,
} from "./feature-flags";
export type { FileType } from "./files";
export { FILE_TYPES, files } from "./files";
export {
  type Invitation,
  invitations,
  type NewInvitation,
} from "./invitations";
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
  NewWorkspaceIntegration,
  NewWorkspaceMember,
  Prompt,
  Transcript,
  UserPreferences,
  Workspace,
  WorkspaceIntegration,
  WorkspaceMember,
} from "./types";
// Export deprecated user settings (for migration)
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
// Export consolidated user settings
export {
  type FilterSettings,
  type KpiSettings,
  type NewUserWorkspaceSettings,
  type NotificationSettings,
  type ReportSettings,
  type UserWorkspaceSettings,
  userWorkspaceSettings,
} from "./user-workspace-settings";
export {
  type FtpIntegrationConfig,
  INTEGRATION_TYPES,
  type IntegrationConfig,
  type IntegrationType,
  workspaceIntegrations,
} from "./workspace-integrations";
export {
  workspaceMemberRole,
  workspaceMembers,
  workspaces,
} from "./workspaces";
