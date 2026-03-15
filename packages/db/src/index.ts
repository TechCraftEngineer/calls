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
export { promptsRepository } from "./repositories/prompts.repository";
export { systemRepository } from "./repositories/system.repository";
export { userWorkspaceSettingsRepository } from "./repositories/user-workspace-settings.repository";
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
  NewUserPreferences,
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
  UserPreferences,
  UserWorkspaceSettings,
  Verification,
  Workspace,
  WorkspaceIntegration,
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
  userPreferences,
  userWorkspaceSettings,
  verification,
  workspaceIntegrations,
  workspaceMemberRole,
  workspaceMembers,
  workspaces,
} from "./schema";
// Services
export {
  callsService,
  filesService,
  invitationsService,
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
