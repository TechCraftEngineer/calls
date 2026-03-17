/**
 * Backend oRPC context and procedures.
 * Uses Better Auth for session; enriches with backend user profile.
 */

import {
  callsService,
  systemRepository,
  usersService,
  workspacesService,
} from "@calls/db";
import { isValidWorkspaceId } from "@calls/shared";
import { ORPCError, os } from "@orpc/server";
import { isAdminUser } from "./user-profile";

export { createBackendContext as createContext };
export type WorkspaceRole = "owner" | "admin" | "member";

type SignUpFn = (opts: {
  body: {
    email: string;
    password: string;
    name: string;
    data?: { givenName?: string; familyName?: string };
  };
}) => Promise<{ user?: { id: string } }>;

export type AuthLike = {
  api: {
    getSession: (opts: {
      headers: Headers;
    }) => Promise<{ user?: Record<string, unknown>; session?: unknown } | null>;
    /** signUpEmail — стандартный метод Better Auth для регистрации по email/паролю */
    signUpEmail?: SignUpFn;
    /** createUser — fallback из admin plugin */
    createUser?: SignUpFn;
    /** setUserPassword — установка пароля существующему пользователю (admin) */
    setUserPassword?: (opts: {
      body: { userId: string; newPassword: string };
    }) => Promise<unknown>;
  };
};

function getWorkspaceIdFromHeaders(headers: Headers): string | null {
  const fromHeader =
    headers.get("x-workspace-id") ?? headers.get("X-Workspace-Id");
  if (fromHeader) {
    const trimmed = fromHeader.trim();
    if (trimmed.length > 0 && isValidWorkspaceId(trimmed)) return trimmed;
  }
  const cookie = headers.get("cookie");
  const match = cookie?.match(/\bactive_workspace_id=([^;]+)/);
  if (match?.[1]) {
    const trimmed = match[1].trim();
    if (trimmed.length > 0 && isValidWorkspaceId(trimmed)) return trimmed;
  }
  return null;
}

type BackendUser =
  | Awaited<ReturnType<typeof usersService.getUserByEmail>>
  | Record<string, unknown>;

export async function createBackendContext(opts: {
  headers: Headers;
  auth?: AuthLike;
}): Promise<{
  callsService: typeof callsService;
  systemRepository: typeof systemRepository;
  usersService: typeof usersService;
  workspacesService: typeof workspacesService;
  sessionEmail: string | null;
  user: BackendUser | null;
  authUserId: string | null;
  workspaceId: string | null;
  workspaceRole: WorkspaceRole | null;
  auth: AuthLike | undefined;
}> {
  let user: BackendUser | null = null;
  let authUserId: string | null = null;
  let sessionEmail: string | null = null;

  if (opts.auth) {
    const session = await opts.auth.api.getSession({ headers: opts.headers });
    if (session?.user) {
      const baUser = session.user as Record<string, unknown>;
      authUserId = typeof baUser.id === "string" ? baUser.id : null;
      const email = (baUser.email ?? baUser.name) as string | undefined;
      if (email) {
        sessionEmail = email;
        const profile = await usersService.getUserByEmail(email);
        user = profile ? { ...profile, ...baUser } : baUser;
      } else if (
        authUserId &&
        baUser &&
        typeof baUser === "object" &&
        baUser.id
      ) {
        // Сессия есть, но email не передан — используем данные из сессии
        user = baUser;
      }
    }
  }

  if (!user) {
    const cookie = opts.headers.get("cookie");
    const match = cookie?.match(/\bsession=([^;]+)/);
    const cookieSessionValue = match?.[1]
      ? decodeURIComponent(match[1].trim())
      : null;
    if (cookieSessionValue) {
      sessionEmail = sessionEmail ?? cookieSessionValue;
      user = await usersService.getUserByEmail(cookieSessionValue);
    }
  }

  let workspaceId = getWorkspaceIdFromHeaders(opts.headers);
  // Fallback: если нет cookie/header, но пользователь авторизован — берём из БД
  if (workspaceId == null && authUserId) {
    workspaceId = await workspacesService.getActiveWorkspaceId(authUserId);
  }
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
    systemRepository,
    usersService,
    workspacesService,
    sessionEmail:
      sessionEmail ??
      (user && typeof user === "object" && "email" in user
        ? ((user as { email?: string }).email ?? null)
        : null),
    user,
    authUserId,
    workspaceId,
    workspaceRole,
    auth: opts.auth,
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
          "Требуется активное рабочее пространство. Укажите X-Workspace-Id в заголовке или active_workspace_id в cookie.",
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
        message: "Требуются права администратора рабочего пространства",
      });
    }
    return next({ context });
  },
);

export const workspaceOwnerProcedure = workspaceProcedure.use(
  ({ context, next }) => {
    if (context.workspaceRole !== "owner") {
      throw new ORPCError("FORBIDDEN", {
        message: "Требуются права владельца рабочего пространства",
      });
    }
    return next({ context });
  },
);
