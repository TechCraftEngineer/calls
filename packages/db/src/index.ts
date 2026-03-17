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
export { evaluationTemplatesRepository } from "./repositories/evaluation-templates.repository";
export { systemRepository } from "./repositories/system.repository";
export { userWorkspaceSettingsRepository } from "./repositories/user-workspace-settings.repository";
// Repositories
export { usersRepository } from "./repositories/users.repository";
export { workspaceSettingsRepository } from "./repositories/workspace-settings.repository";
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
  NewSubscription,
  NewTranscript,
  NewUsageMetric,
  NewUserPreferences,
  NewUserWorkspaceSettings,
  NewWorkspace,
  NewWorkspaceMember,
  NotificationSettings,
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
  workspaceSettings,
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
export type { EmailReportRecipient } from "./services/email-reports.service";
// Email reports
export {
  getEmailReportRecipients,
  getWorkspaceIdsWithEmailReportRecipients,
} from "./services/email-reports.service";
export type {
  ReportScheduleSettings,
  ReportType,
  TelegramReportRecipient,
} from "./services/telegram-reports.service";
// Telegram reports
export {
  getInternalNumbersForUserIds,
  getReportScheduleSettings,
  getTelegramReportRecipients,
} from "./services/telegram-reports.service";
export { UsersService } from "./services/users.service";
// Types
export type {
  CallWithTranscript,
  CreateCallData,
  EvaluationData,
  GetCallsParams,
} from "./types/calls.types";
export type {
  CreateUserData,
  UpdateUserData,
  UserUpdateData,
} from "./types/users.types";
// Utilities
export { batchInsert, batchInsertTransaction } from "./utils/batch";
export { isValidWorkspaceId } from "./utils/workspace-id-generator";
// Validators
export { ValidationError } from "./validators/user.validators";
