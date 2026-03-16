/**
 * Accept invitation - new user creates account via Better Auth and joins workspace.
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

export const acceptInvitation = publicProcedure
  .input(inputSchema)
  .handler(async ({ input, context }) => {
    const { token, password, name } = input;
    const auth = context.auth;

    if (!auth?.api?.createUser) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Сервис авторизации недоступен",
      });
    }

    const createUserFn = async (opts: {
      email: string;
      password: string;
      name: string;
      givenName?: string;
      familyName?: string;
    }) => {
      const res = await auth.api.createUser!({
        body: {
          email: opts.email,
          password: opts.password,
          name: opts.name,
          data: {
            givenName: opts.givenName ?? opts.name,
            familyName: opts.familyName ?? "",
          },
        },
      });
      const userId = res?.user?.id;
      if (!userId) {
        throw new Error("Не удалось создать пользователя");
      }
      return { id: userId };
    };

    try {
      const { userId } = await invitationsService.acceptInvitation(
        token,
        password,
        name,
        createUserFn,
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
