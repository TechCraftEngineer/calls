/**
 * Server-side API: invoke oRPC procedures with context (no HTTP).
 * Use for REST handlers that delegate to backend-api as the main API.
 */

import type { BackendContext } from "./orpc";
import { backendRouter } from "./orpc-root";

type ProcedureWithCallable = {
  callable: (opts: {
    context: BackendContext;
  }) => (input?: unknown) => Promise<unknown>;
};

function callProc(
  proc: ProcedureWithCallable,
  ctx: BackendContext,
  input?: unknown,
) {
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
        callProc(
          backendRouter.calls.generateRecommendations as ProcedureWithCallable,
          ctx,
          input,
        ),
      delete: (input: { call_id: string }) =>
        callProc(
          backendRouter.calls.delete as ProcedureWithCallable,
          ctx,
          input,
        ),
    },
    users: {
      list: () =>
        callProc(backendRouter.users.list as ProcedureWithCallable, ctx),
      get: (input: { user_id: number }) =>
        callProc(backendRouter.users.get as ProcedureWithCallable, ctx, input),
      create: (input: {
        username: string;
        password: string;
        givenName: string;
        familyName?: string;
        internalExtensions?: string | null;
        mobilePhones?: string | null;
      }) =>
        callProc(
          backendRouter.users.create as ProcedureWithCallable,
          ctx,
          input,
        ),
      update: (input: { user_id: number; data: Record<string, unknown> }) =>
        callProc(
          backendRouter.users.update as ProcedureWithCallable,
          ctx,
          input,
        ),
      delete: (input: { user_id: number }) =>
        callProc(
          backendRouter.users.delete as ProcedureWithCallable,
          ctx,
          input,
        ),
      changePassword: (input: {
        user_id: number;
        new_password: string;
        confirm_password: string;
      }) =>
        callProc(
          backendRouter.users.changePassword as ProcedureWithCallable,
          ctx,
          input,
        ),
      telegramAuthUrl: (input: { user_id: number }) =>
        callProc(
          backendRouter.users.telegramAuthUrl as ProcedureWithCallable,
          ctx,
          input,
        ),
      disconnectTelegram: (input: { user_id: number }) =>
        callProc(
          backendRouter.users.disconnectTelegram as ProcedureWithCallable,
          ctx,
          input,
        ),
      maxAuthUrl: (input: { user_id: number }) =>
        callProc(
          backendRouter.users.maxAuthUrl as ProcedureWithCallable,
          ctx,
          input,
        ),
      disconnectMax: (input: { user_id: number }) =>
        callProc(
          backendRouter.users.disconnectMax as ProcedureWithCallable,
          ctx,
          input,
        ),
    },
    settings: {
      getPrompts: () =>
        callProc(
          backendRouter.settings.getPrompts as ProcedureWithCallable,
          ctx,
        ),
      updatePrompts: (input: Record<string, unknown>) =>
        callProc(
          backendRouter.settings.updatePrompts as ProcedureWithCallable,
          ctx,
          input,
        ),
      getModels: () =>
        callProc(
          backendRouter.settings.getModels as ProcedureWithCallable,
          ctx,
        ),
      backup: () =>
        callProc(backendRouter.settings.backup as ProcedureWithCallable, ctx),
    },
    statistics: {
      getStatistics: (input?: {
        date_from?: string;
        date_to?: string;
        sort?: string;
        order?: string;
      }) =>
        callProc(
          backendRouter.statistics.getStatistics as ProcedureWithCallable,
          ctx,
          input,
        ),
      getMetrics: () =>
        callProc(
          backendRouter.statistics.getMetrics as ProcedureWithCallable,
          ctx,
        ),
    },
    reports: {
      sendTestTelegram: () =>
        callProc(
          backendRouter.reports.sendTestTelegram as ProcedureWithCallable,
          ctx,
        ),
    },
    auth: {
      me: () => callProc(backendRouter.auth.me as ProcedureWithCallable, ctx),
    },
    workspaces: {
      list: () =>
        callProc(backendRouter.workspaces.list as ProcedureWithCallable, ctx),
      get: (input: { workspaceId: string }) =>
        callProc(
          backendRouter.workspaces.get as ProcedureWithCallable,
          ctx,
          input,
        ),
      create: (input: { name: string; slug: string }) =>
        callProc(
          backendRouter.workspaces.create as ProcedureWithCallable,
          ctx,
          input,
        ),
      update: (input: { workspaceId: string; name?: string; slug?: string }) =>
        callProc(
          backendRouter.workspaces.update as ProcedureWithCallable,
          ctx,
          input,
        ),
      delete: (input: { workspaceId: string }) =>
        callProc(
          backendRouter.workspaces.delete as ProcedureWithCallable,
          ctx,
          input,
        ),
      listMembers: (input: { workspaceId: string }) =>
        callProc(
          backendRouter.workspaces.listMembers as ProcedureWithCallable,
          ctx,
          input,
        ),
      addMember: (input: {
        workspaceId: string;
        userId: string;
        role: "owner" | "admin" | "member";
      }) =>
        callProc(
          backendRouter.workspaces.addMember as ProcedureWithCallable,
          ctx,
          input,
        ),
      removeMember: (input: { workspaceId: string; userId: string }) =>
        callProc(
          backendRouter.workspaces.removeMember as ProcedureWithCallable,
          ctx,
          input,
        ),
      updateMemberRole: (input: {
        workspaceId: string;
        userId: string;
        role: "owner" | "admin" | "member";
      }) =>
        callProc(
          backendRouter.workspaces.updateMemberRole as ProcedureWithCallable,
          ctx,
          input,
        ),
      setActive: (input: { workspaceId: string }) =>
        callProc(
          backendRouter.workspaces.setActive as ProcedureWithCallable,
          ctx,
          input,
        ),
    },
  };
}
