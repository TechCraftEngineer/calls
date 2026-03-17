/**
 * Check if user has password - verifies if user has credential account
 */

import { createLogger } from "@calls/api";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { publicProcedure } from "../../orpc";

const logger = createLogger("check-user-password");

type AuthWithInternalContext = {
  $context: Promise<{
    internalAdapter: {
      findUserByEmail?: (
        email: string,
      ) => Promise<{ id: string } | Array<{ id: string }> | null | undefined>;
      findAccounts: (
        userId: string,
      ) => Promise<
        Array<{ providerId: string; accountId: string; userId: string }>
      >;
    };
  }>;
};

const inputSchema = z.object({
  email: z.string().email("Некорректный email"),
});

export const checkUserPassword = publicProcedure
  .input(inputSchema)
  .handler(async ({ input, context }) => {
    try {
      const auth = context.auth as AuthWithInternalContext | undefined;

      if (!auth?.$context) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Сервис авторизации недоступен",
        });
      }

      const authCtx = await auth.$context;
      const { internalAdapter } = authCtx;

      // Ищем пользователя по email
      const users = await internalAdapter.findUserByEmail?.(
        input.email.toLowerCase().trim(),
      );

      if (!users || (Array.isArray(users) && users.length === 0)) {
        return { hasPassword: false, exists: false };
      }

      const user = Array.isArray(users) ? users[0] : users;

      if (!user?.id) {
        return { hasPassword: false, exists: false };
      }

      // Проверяем наличие credential аккаунта
      const accounts = await internalAdapter.findAccounts(user.id);
      const hasCredential = accounts.some((a) => a.providerId === "credential");

      logger.info("Password check result", {
        email: input.email,
        userId: user.id,
        hasPassword: hasCredential,
        accountCount: accounts.length,
      });

      return {
        hasPassword: hasCredential,
        exists: true,
        userId: user.id,
      };
    } catch (e) {
      if (e instanceof ORPCError) throw e;

      logger.error("checkUserPassword failed", {
        email: input.email,
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      });

      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Ошибка при проверке пароля пользователя",
      });
    }
  });
