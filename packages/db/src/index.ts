/**
 * Main entry point for the database package
 * Exports all schemas, repositories, services, and types
 */

// Database client
export { db } from "./client";
export { db as dbEdge } from "./client.ws";
// Workspace utilities
export {
  createWorkspaceErrorResponse,
  createWorkspaceNullResponse,
  getDefaultWorkspace,
  handleWorkspaceError,
} from "./lib/workspace-utils";
export { systemRepository } from "./repositories/system.repository";
export {
  userFilterSettingsRepository,
  userKpiSettingsRepository,
  userNotificationSettingsRepository,
  userReportSettingsRepository,
} from "./repositories/user-settings.repository";
// Repositories
export { usersRepository } from "./repositories/users.repository";
// Schemas and types
export type {
  Account,
  ActivityLog,
  AuditLog,
  Call,
  CallEvaluation,
  FeatureFlag,
  File,
  FileType,
  FilterSettings,
  Invitation,
  Invoice,
  KpiSettings,
  NewActivityLog,
  NewAuditLog,
  NewCall,
  NewCallEvaluation,
  NewFeatureFlag,
  NewFile,
  NewInvitation,
  NewInvoice,
  NewPrompt,
  NewSubscription,
  NewTranscript,
  NewUsageMetric,
  NewUserFilterSettings,
  NewUserKpiSettings,
  NewUserNotificationSettings,
  NewUserPreferences,
  NewUserReportSettings,
  NewUserWorkspaceSettings,
  NewWorkspace,
  NewWorkspaceMember,
  NotificationSettings,
  Prompt,
  ReportSettings,
  Session,
  Subscription,
  Transcript,
  UsageMetric,
  User,
  UserFilterSettings,
  UserKpiSettings,
  UserNotificationSettings,
  UserPreferences,
  UserReportSettings,
  UserWorkspaceSettings,
  Verification,
  Workspace,
  WorkspaceMember,
} from "./schema";
export {
  account,
  activityLog,
  auditLog,
  callEvaluations,
  calls,
  FILE_TYPES,
  featureFlags,
  files,
  invitations,
  invoices,
  prompts,
  session,
  subscriptionPlan,
  subscriptionStatus,
  subscriptions,
  transcripts,
  usageMetrics,
  user,
  userFilterSettings,
  userKpiSettings,
  userNotificationSettings,
  userPreferences,
  userReportSettings,
  userWorkspaceSettings,
  verification,
  workspaceMemberRole,
  workspaceMembers,
  workspaces,
} from "./schema";
// Services
export {
  callsService,
  filesService,
  promptsService,
  settingsService,
  usersService,
  workspacesService,
} from "./services";
export { UsersService } from "./services/users.service";
// Types
export type {
  CreateUserData,
  UpdateUserData,
  UserUpdateData,
} from "./types/users.types";
// Utilities
export { batchInsert, batchInsertTransaction } from "./utils/batch";
// Validators
export { ValidationError } from "./validators/user.validators";
