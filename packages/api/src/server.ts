/**
 * Server-side API: invoke oRPC procedures with context (no HTTP).
 * Use for REST handlers that delegate to backend-api as the main API.
 */

import type { BackendContext } from "./orpc";
import { backendRouter } from "./orpc-root";

type ProcedureWithCallable = {
  callable: (opts: { context: BackendContext }) => (input?: unknown) => Promise<unknown>;
};

type ProcInput<TProc> = TProc extends {
  callable: (opts: { context: BackendContext }) => (input: infer TInput) => unknown;
}
  ? TInput
  : never;

function callProc(proc: ProcedureWithCallable, ctx: BackendContext, input?: unknown) {
  const fn = proc.callable({ context: ctx });
  return fn(input) as Promise<unknown>;
}

/**
 * Server-side API client. Calls oRPC procedures directly with context.
 * Use in backend-server REST handlers to delegate to backend-api.
 */
export function createBackendApiWithContext(ctx: BackendContext) {
  return {
    calls: {
      list: (input: Parameters<typeof callProc>[2]) =>
        callProc(backendRouter.calls.list as ProcedureWithCallable, ctx, input),
      get: (input: { call_id: string }) =>
        callProc(backendRouter.calls.get as ProcedureWithCallable, ctx, input),
      generateRecommendations: (input: { call_id: string }) =>
        callProc(backendRouter.calls.generateRecommendations as ProcedureWithCallable, ctx, input),
      delete: (input: { call_id: string }) =>
        callProc(backendRouter.calls.delete as ProcedureWithCallable, ctx, input),
    },
    users: {
      list: () => callProc(backendRouter.users.list as ProcedureWithCallable, ctx),
      get: (input: { userId: string }) =>
        callProc(backendRouter.users.get as ProcedureWithCallable, ctx, input),
      create: (input: {
        email: string;
        password: string;
        givenName: string;
        familyName?: string;
        internalExtensions?: string | null;
        mobilePhones?: string | null;
      }) => callProc(backendRouter.users.create as ProcedureWithCallable, ctx, input),
      update: (input: { userId: string; data: Record<string, unknown> }) =>
        callProc(backendRouter.users.update as ProcedureWithCallable, ctx, input),
      delete: (input: { userId: string }) =>
        callProc(backendRouter.users.delete as ProcedureWithCallable, ctx, input),
      telegramAuthUrl: (input: { userId: string }) =>
        callProc(backendRouter.users.telegramAuthUrl as ProcedureWithCallable, ctx, input),
      disconnectTelegram: (input: { userId: string }) =>
        callProc(backendRouter.users.disconnectTelegram as ProcedureWithCallable, ctx, input),
      maxAuthUrl: (input: { userId: string }) =>
        callProc(backendRouter.users.maxAuthUrl as ProcedureWithCallable, ctx, input),
      disconnectMax: (input: { userId: string }) =>
        callProc(backendRouter.users.disconnectMax as ProcedureWithCallable, ctx, input),
    },
    settings: {
      getPrompts: () => callProc(backendRouter.settings.getPrompts as ProcedureWithCallable, ctx),
      getIntegrations: () =>
        callProc(backendRouter.settings.getIntegrations as ProcedureWithCallable, ctx),
      updatePrompts: (input: Record<string, unknown>) =>
        callProc(backendRouter.settings.updatePrompts as ProcedureWithCallable, ctx, input),
      updateIntegrations: (input: {
        telegram_bot_token?: string | null;
        max_bot_token?: string | null;
      }) =>
        callProc(backendRouter.settings.updateIntegrations as ProcedureWithCallable, ctx, input),
      getModels: () => callProc(backendRouter.settings.getModels as ProcedureWithCallable, ctx),
      backup: () => callProc(backendRouter.settings.backup as ProcedureWithCallable, ctx),
      testFtp: (input: { host: string; user: string; password: string }) =>
        callProc(backendRouter.settings.testFtp as ProcedureWithCallable, ctx, input),
      checkFtpStatus: () =>
        callProc(backendRouter.settings.checkFtpStatus as ProcedureWithCallable, ctx),
      getPbx: () => callProc(backendRouter.settings.getPbx as ProcedureWithCallable, ctx),
      updatePbx: (input: ProcInput<typeof backendRouter.settings.updatePbx>) =>
        callProc(backendRouter.settings.updatePbx as ProcedureWithCallable, ctx, input),
      testPbx: (input: ProcInput<typeof backendRouter.settings.testPbx>) =>
        callProc(backendRouter.settings.testPbx as ProcedureWithCallable, ctx, input),
      syncPbxDirectory: () =>
        callProc(backendRouter.settings.syncPbxDirectory as ProcedureWithCallable, ctx),
      syncPbxCalls: () =>
        callProc(backendRouter.settings.syncPbxCalls as ProcedureWithCallable, ctx),
      syncPbxRecordings: () =>
        callProc(backendRouter.settings.syncPbxRecordings as ProcedureWithCallable, ctx),
      listPbxEmployees: () =>
        callProc(backendRouter.settings.listPbxEmployees as ProcedureWithCallable, ctx),
      listPbxNumbers: () =>
        callProc(backendRouter.settings.listPbxNumbers as ProcedureWithCallable, ctx),
      updateFtp: (input: {
        enabled: boolean;
        host: string;
        user: string;
        password: string;
        syncFromDate?: string;
      }) => callProc(backendRouter.settings.updateFtp as ProcedureWithCallable, ctx, input),
    },
    statistics: {
      getStatistics: (input?: {
        date_from?: string;
        date_to?: string;
        sort?: string;
        order?: string;
      }) => callProc(backendRouter.statistics.getStatistics as ProcedureWithCallable, ctx, input),
      getMetrics: () => callProc(backendRouter.statistics.getMetrics as ProcedureWithCallable, ctx),
      getKpi: (input: { startDate: string; endDate: string }) =>
        callProc(backendRouter.statistics.getKpi as ProcedureWithCallable, ctx, input),
      updateKpiEmployee: (input: {
        employeeExternalId: string;
        data: {
          kpiBaseSalary: number;
          kpiTargetBonus: number;
          kpiTargetTalkTimeMinutes: number;
        };
      }) =>
        callProc(backendRouter.statistics.updateKpiEmployee as ProcedureWithCallable, ctx, input),
    },
    reports: {
      sendTestTelegram: () =>
        callProc(backendRouter.reports.sendTestTelegram as ProcedureWithCallable, ctx),
    },
    auth: {
      me: () => callProc(backendRouter.auth.me as ProcedureWithCallable, ctx),
    },
    workspaces: {
      list: () => callProc(backendRouter.workspaces.list as ProcedureWithCallable, ctx),
      get: (input: { workspaceId: string }) =>
        callProc(backendRouter.workspaces.get as ProcedureWithCallable, ctx, input),
      create: (input: ProcInput<typeof backendRouter.workspaces.create>) =>
        callProc(backendRouter.workspaces.create as ProcedureWithCallable, ctx, input),
      update: (input: ProcInput<typeof backendRouter.workspaces.update>) =>
        callProc(backendRouter.workspaces.update as ProcedureWithCallable, ctx, input),
      delete: (input: { workspaceId: string }) =>
        callProc(backendRouter.workspaces.delete as ProcedureWithCallable, ctx, input),
      listMembers: (input: { workspaceId: string }) =>
        callProc(backendRouter.workspaces.listMembers as ProcedureWithCallable, ctx, input),
      addMember: (input: {
        workspaceId: string;
        userId: string;
        role: "owner" | "admin" | "member";
      }) => callProc(backendRouter.workspaces.addMember as ProcedureWithCallable, ctx, input),
      removeMember: (input: { workspaceId: string; userId: string }) =>
        callProc(backendRouter.workspaces.removeMember as ProcedureWithCallable, ctx, input),
      updateMemberRole: (input: {
        workspaceId: string;
        userId: string;
        role: "owner" | "admin" | "member";
      }) =>
        callProc(backendRouter.workspaces.updateMemberRole as ProcedureWithCallable, ctx, input),
      setActive: (input: { workspaceId: string }) =>
        callProc(backendRouter.workspaces.setActive as ProcedureWithCallable, ctx, input),
      createInvitation: (input: {
        workspaceId: string;
        email: string;
        role?: "owner" | "admin" | "member";
      }) =>
        callProc(backendRouter.workspaces.createInvitation as ProcedureWithCallable, ctx, input),
      listInvitations: (input: { workspaceId: string }) =>
        callProc(backendRouter.workspaces.listInvitations as ProcedureWithCallable, ctx, input),
      revokeInvitation: (input: { workspaceId: string; invitationId: string }) =>
        callProc(backendRouter.workspaces.revokeInvitation as ProcedureWithCallable, ctx, input),
      getInvitationByToken: (input: { token: string }) =>
        callProc(
          backendRouter.workspaces.getInvitationByToken as ProcedureWithCallable,
          ctx,
          input,
        ),
    },
  };
}
