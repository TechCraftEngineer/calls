/**
 * Accept invitation - new user creates account via Better Auth internal adapter
 * (создание пользователя + linkAccount с паролем) and joins workspace.
 * Public procedure (no auth required).
 */

import { createLogger } from "@calls/api";
import { invitationsService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { publicProcedure } from "../../../orpc";

const logger = createLogger("accept-invitation");

const inputSchema = z.object({
  token: z.string().min(1, "Токен приглашения обязателен"),
  password: z.string().min(8, "Пароль должен быть не менее 8 символов"),
  name: z.string().optional(),
  email: z.string().email("Некорректный email").optional(),
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
      findAccounts: (userId: string) => Promise<
        Array<{
          providerId: string;
          accountId: string;
          userId: string;
        }>
      >;
      updatePassword: (userId: string, hashedPassword: string) => Promise<void>;
    };
    password: { hash: (plain: string) => Promise<string> };
    generateId: (opts?: { model?: string; size?: number }) => string;
  }>;
  // Также доступен setUserPassword из auth.api
  api?: {
    setUserPassword?: (opts: { body: { userId: string; newPassword: string } }) => Promise<unknown>;
  };
};

export const acceptInvitation = publicProcedure
  .input(inputSchema)
  .handler(async ({ input, context }) => {
    const { token, password, name, email } = input;
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
      try {
        logger.info("Creating new user for invitation", {
          email: opts.email.toLowerCase().trim(),
        });

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

        logger.info("Successfully created user", {
          userId: createdUser.id,
          email: normalizedEmail,
        });

        const hashedPassword = await pwd.hash(opts.password);
        // Генерируем уникальный accountId для Better Auth
        const accountId = generateId({ model: "account" }) ?? crypto.randomUUID();

        logger.info("Linking credential account", {
          userId: createdUser.id,
          accountId,
        });

        await internalAdapter.linkAccount({
          userId: createdUser.id,
          accountId: accountId,
          providerId: "credential",
          password: hashedPassword,
        });

        logger.info("Successfully linked credential account", {
          userId: createdUser.id,
          accountId,
        });

        return { id: createdUser.id };
      } catch (error) {
        logger.error("Failed to create user and link account", {
          email: opts.email,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    };

    const setPasswordFn = async (userId: string, newPassword: string) => {
      try {
        logger.info("Checking if user needs password setup", { userId });

        const accounts = await internalAdapter.findAccounts(userId);

        logger.info("Found accounts for user", {
          userId,
          accountCount: accounts.length,
          accounts: accounts.map((a) => ({
            providerId: a.providerId,
            accountId: a.accountId,
          })),
        });

        const credentialAccount = accounts.find((a) => a.providerId === "credential");

        // Устанавливаем пароль только если у пользователя НЕТ аккаунта с паролем
        if (credentialAccount) {
          logger.info("User already has credential account - skipping password setup", {
            userId,
            accountId: credentialAccount.accountId,
          });
          return; // Ничего не делаем, пароль уже есть
        }

        // Создаем новый credential аккаунт для пользователя
        logger.info("Creating new credential account for existing user", {
          userId,
        });
        const accountId = generateId({ model: "account" }) ?? crypto.randomUUID();
        const hashedPassword = await pwd.hash(newPassword);

        await internalAdapter.linkAccount({
          userId,
          accountId: accountId,
          providerId: "credential",
          password: hashedPassword,
        });

        logger.info("Successfully created credential account for existing user", {
          userId,
          accountId,
        });
      } catch (error) {
        logger.error("Failed to set up password for user", {
          userId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw new Error("Не удалось установить пароль");
      }
    };

    try {
      const { userId } = await invitationsService.acceptInvitation(
        token,
        password,
        name,
        email,
        createUserFn,
        setPasswordFn,
      );
      return { success: true, userId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Не удалось принять приглашение";
      logger.error("acceptInvitation failed", {
        token: `${token.slice(0, 8)}...`,
        error: msg,
      });
      throw new ORPCError("BAD_REQUEST", { message: msg });
    }
  });
