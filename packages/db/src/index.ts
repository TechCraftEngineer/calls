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
  handleWorkspaceError,
} from "./lib/workspace-utils";
export { parseDateToUTC } from "./repositories/calls/date-utils";
export type {
  DailyKpiStat,
  GetDailyKpiStatsInput,
} from "./repositories/calls/get-daily-kpi-stats";
export type { ManagerStatsRow } from "./repositories/calls/get-evaluations-stats";
export { evaluationTemplatesRepository } from "./repositories/evaluation-templates.repository";
export { megaPbxRepository } from "./repositories/megapbx.repository";
export { pbxRepository } from "./repositories/pbx.repository";
export { systemRepository } from "./repositories/system.repository";
export { userWorkspaceSettingsRepository } from "./repositories/user-workspace-settings.repository";
// Repositories
export { usersRepository } from "./repositories/users.repository";
export { workspaceIntegrationsRepository } from "./repositories/workspace-integrations.repository";
export { workspaceSettingsRepository } from "./repositories/workspace-settings.repository";
export { workspacesRepository } from "./repositories/workspaces.repository";
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
  MegaPbxIntegrationConfig,
  MegaPbxWebhookConfig,
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
  NewWorkspaceMegaPbxEmployee,
  NewWorkspaceMegaPbxLink,
  NewWorkspaceMegaPbxNumber,
  NewWorkspaceMegaPbxSyncState,
  NewWorkspaceMegaPbxWebhookEvent,
  NewWorkspaceMember,
  NewWorkspacePbxEmployee,
  NewWorkspacePbxLink,
  NewWorkspacePbxNumber,
  NewWorkspacePbxSyncState,
  NewWorkspacePbxWebhookEvent,
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
  WorkspaceMegaPbxEmployee,
  WorkspaceMegaPbxLink,
  WorkspaceMegaPbxNumber,
  WorkspaceMegaPbxSyncState,
  WorkspaceMegaPbxWebhookEvent,
  WorkspaceMember,
  WorkspacePbxEmployee,
  WorkspacePbxLink,
  WorkspacePbxNumber,
  WorkspacePbxSyncState,
  WorkspacePbxWebhookEvent,
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
  workspaceMegaPbxEmployees,
  workspaceMegaPbxLinks,
  workspaceMegaPbxNumbers,
  workspaceMegaPbxSyncState,
  workspaceMegaPbxWebhookEvents,
  workspaceMemberRole,
  workspaceMembers,
  workspacePbxEmployees,
  workspacePbxLinks,
  workspacePbxNumbers,
  workspacePbxSyncState,
  workspacePbxWebhookEvents,
  workspaceSettings,
  workspaces,
} from "./schema";
// Services
export {
  callsService,
  filesService,
  invitationsService,
  pbxService,
  settingsService,
  usersService,
  workspacesService,
} from "./services";
// Email reports
export type { EmailReportRecipient } from "./services/email-reports.service";
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
  getWorkspaceIdsWithTelegramReportRecipients,
} from "./services/telegram-reports.service";
export { UsersService } from "./services/users.service";
// Types
export type {
  CallWithTranscript,
  CreateCallData,
  EvaluationData,
  GetCallManagersParams,
  GetCallsParams,
} from "./types/calls.types";
export type {
  CreateUserData,
  UpdateUserData,
  UserUpdateData,
} from "./types/users.types";
// Utilities
export { batchInsert, batchInsertTransaction } from "./utils/batch";
export {
  CALL_STATUS,
  type CallStatus,
  normalizeCallStatus,
} from "./utils/call-status";
export { normalizePhoneNumberList } from "./utils/normalize-phone-number-list";
export { isValidWorkspaceId } from "./utils/workspace-id-generator";
// Validators
export { ValidationError } from "./validators/user.validators";
