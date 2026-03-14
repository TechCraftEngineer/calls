/**
 * Backend oRPC context and procedures.
 * Uses Better Auth for session; enriches with backend user profile.
 */

import {
  callsService,
  promptsService,
  systemRepository,
  usersService,
  workspacesService,
} from "@calls/db";
import { ORPCError, os } from "@orpc/server";
import { isAdminUser } from "./user-profile";

export type WorkspaceRole = "owner" | "admin" | "member";

export type AuthLike = {
  api: {
    getSession: (opts: {
      headers: Headers;
    }) => Promise<{ user?: Record<string, unknown>; session?: unknown } | null>;
  };
};

function getWorkspaceIdFromHeaders(headers: Headers): string | null {
  const fromHeader =
    headers.get("x-workspace-id") ?? headers.get("X-Workspace-Id");
  if (fromHeader) {
    const trimmed = fromHeader.trim();
    if (trimmed.length > 0) return trimmed;
  }
  const cookie = headers.get("cookie");
  const match = cookie?.match(/\bactive_workspace_id=([^;]+)/);
  if (match?.[1]) {
    const trimmed = match[1].trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

export async function createBackendContext(opts: {
  headers: Headers;
  auth?: AuthLike;
}): Promise<{
  callsService: any;
  promptsService: any;
  systemRepository: any;
  usersService: any;
  workspacesService: any;
  sessionUsername: string | null;
  user: any;
  authUserId: string | null;
  workspaceId: string | null;
  workspaceRole: WorkspaceRole | null;
}> {
  let user: any = null;
  let authUserId: string | null = null;

  if (opts.auth) {
    const session = await opts.auth.api.getSession({ headers: opts.headers });
    if (session?.user) {
      const baUser = session.user as Record<string, unknown>;
      authUserId = typeof baUser.id === "string" ? baUser.id : null;
      const username = (baUser.username ?? baUser.email ?? baUser.name) as
        | string
        | undefined;
      if (username) {
        const profile = await usersService.getUserByUsername(username);
        user = profile ? { ...profile, ...baUser } : baUser;
      }
    }
  }

  if (!user) {
    const cookie = opts.headers.get("cookie");
    const match = cookie?.match(/\bsession=([^;]+)/);
    const sessionUsername = match?.[1]
      ? decodeURIComponent(match[1].trim())
      : null;
    if (sessionUsername) {
      user = await usersService.getUserByUsername(sessionUsername);
    }
  }

  const workspaceId = getWorkspaceIdFromHeaders(opts.headers);
  let workspaceRole: WorkspaceRole | null = null;

  if (workspaceId != null && authUserId) {
    const role = await workspacesService.ensureUserInWorkspace(
      workspaceId,
      authUserId,
    );
    workspaceRole = role;
  } else if (workspaceId != null && !authUserId) {
    workspaceRole = null;
  }

  return {
    callsService,
    promptsService,
    systemRepository,
    usersService,
    workspacesService,
    sessionUsername: user?.username ?? null,
    user,
    authUserId,
    workspaceId,
    workspaceRole,
  };
}

export type BackendContext = Awaited<ReturnType<typeof createBackendContext>>;

const o = os.$context<BackendContext>();

const timingMiddleware = o.middleware(async ({ next, path }) => {
  const start = Date.now();
  try {
    return await next();
  } finally {
    console.log(`[Backend oRPC] ${path} took ${Date.now() - start}ms`);
  }
});

export const publicProcedure = o.use(timingMiddleware);

export const protectedProcedure = publicProcedure.use(({ context, next }) => {
  if (!context.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: { ...context, user: context.user },
  });
});

export const adminProcedure = protectedProcedure.use(({ context, next }) => {
  if (!isAdminUser(context.user as Record<string, unknown>)) {
    throw new ORPCError("FORBIDDEN");
  }
  return next({ context });
});

export const workspaceProcedure = protectedProcedure.use(
  ({ context, next }) => {
    if (context.workspaceId == null || context.workspaceRole == null) {
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Требуется активный workspace. Укажите X-Workspace-Id в заголовке или active_workspace_id в cookie.",
      });
    }
    return next({
      context: {
        ...context,
        workspaceId: context.workspaceId,
        workspaceRole: context.workspaceRole,
      },
    });
  },
);

export const workspaceMemberProcedure = workspaceProcedure;

export const workspaceAdminProcedure = workspaceProcedure.use(
  ({ context, next }) => {
    if (
      context.workspaceRole !== "admin" &&
      context.workspaceRole !== "owner"
    ) {
      throw new ORPCError("FORBIDDEN", {
        message: "Требуются права администратора workspace",
      });
    }
    return next({ context });
  },
);

export const workspaceOwnerProcedure = workspaceProcedure.use(
  ({ context, next }) => {
    if (context.workspaceRole !== "owner") {
      throw new ORPCError("FORBIDDEN", {
        message: "Требуются права владельца workspace",
      });
    }
    return next({ context });
  },
);
