/**
 * Accept invitation - new user creates account via Better Auth internal adapter
 * (создание пользователя + linkAccount с паролем) and joins workspace.
 * Public procedure (no auth required).
 */

import { createLogger } from "@calls/api";
import { invitationsService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { publicProcedure } from "../../orpc";

const logger = createLogger("accept-invitation");

const inputSchema = z.object({
  token: z.string().min(1, "Токен приглашения обязателен"),
  password: z.string().min(8, "Пароль должен быть не менее 8 символов"),
  name: z.string().optional(),
});

type AuthWithContext = {
  $context: Promise<{
    internalAdapter: {
      createUser: (user: Record<string, unknown>) => Promise<{ id: string }>;
      linkAccount: (account: {
        userId: string;
        accountId: string;
        providerId: string;
        password: string;
      }) => Promise<unknown>;
      findAccounts: (userId: string) => Promise<Array<{ providerId: string }>>;
      updatePassword: (userId: string, hashedPassword: string) => Promise<void>;
    };
    password: { hash: (plain: string) => Promise<string> };
    generateId: (opts?: { model?: string; size?: number }) => string;
  }>;
};

export const acceptInvitation = publicProcedure
  .input(inputSchema)
  .handler(async ({ input, context }) => {
    const { token, password, name } = input;
    const auth = context.auth as AuthWithContext | undefined;

    if (!auth?.$context) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Сервис авторизации недоступен",
      });
    }

    const authCtx = await auth.$context;
    const { internalAdapter, password: pwd, generateId } = authCtx;

    const createUserFn = async (opts: {
      email: string;
      password: string;
      name: string;
      givenName?: string;
      familyName?: string;
    }) => {
      const normalizedEmail = opts.email.toLowerCase().trim();
      const userId = generateId({ model: "user" }) ?? crypto.randomUUID();

      const createdUser = await internalAdapter.createUser({
        id: userId,
        email: normalizedEmail,
        name: opts.name,
        emailVerified: false,
        givenName: opts.givenName ?? opts.name,
        familyName: opts.familyName ?? "",
      });

      if (!createdUser?.id) {
        throw new Error("Не удалось создать пользователя");
      }

      const hashedPassword = await pwd.hash(opts.password);
      // Генерируем уникальный accountId для Better Auth
      const accountId = generateId({ model: "account" }) ?? crypto.randomUUID();
      
      await internalAdapter.linkAccount({
        userId: createdUser.id,
        accountId: accountId,
        providerId: "credential",
        password: hashedPassword,
      });

      return { id: createdUser.id };
    };

    const setPasswordFn = async (userId: string, newPassword: string) => {
      try {
        const hashedPassword = await pwd.hash(newPassword);
        const accounts = await internalAdapter.findAccounts(userId);
        const hasCredential = accounts.some((a) => a.providerId === "credential");

        if (hasCredential) {
          await internalAdapter.updatePassword(userId, hashedPassword);
        } else {
          // Генерируем уникальный accountId для нового аккаунта
          const accountId = generateId({ model: "account" }) ?? crypto.randomUUID();
          await internalAdapter.linkAccount({
            userId,
            accountId: accountId,
            providerId: "credential",
            password: hashedPassword,
          });
        }
      } catch (error) {
        logger.error("Failed to set password for user", {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        throw new Error("Не удалось установить пароль");
      }
    };

    try {
      const { userId } = await invitationsService.acceptInvitation(
        token,
        password,
        name,
        createUserFn,
        setPasswordFn,
      );
      return { success: true, userId };
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Не удалось принять приглашение";
      logger.error("acceptInvitation failed", {
        token: `${token.slice(0, 8)}...`,
        error: msg,
      });
      throw new ORPCError("BAD_REQUEST", { message: msg });
    }
  });
