import { randomBytes } from "node:crypto";
import { promptsService, usersService } from "@calls/db";
import { getBotUsername } from "@calls/telegram-bot";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../../orpc";
import { canAccessUser } from "../utils";

export const telegramAuthUrl = workspaceProcedure
  .input(z.object({ user_id: z.string() }))
  .handler(async ({ input, context }) => {
    const { workspaceId } = context;
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });
    const user = await usersService.getUser(input.user_id);
    if (!user)
      throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });
    const token = randomBytes(16).toString("base64url");
    if (!(await usersService.saveTelegramConnectToken(input.user_id, token)))
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось сохранить токен",
      });
    const botToken = await promptsService.getPrompt(
      "telegram_bot_token",
      workspaceId,
    );
    const botUsername = botToken?.trim()
      ? await getBotUsername(botToken)
      : "mango_react_bot";
    return { url: `https://t.me/${botUsername}?start=${token}` };
  });

export const disconnectTelegram = workspaceProcedure
  .input(z.object({ user_id: z.string() }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });
    if (!(await usersService.disconnectTelegram(input.user_id)))
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось отключить Telegram",
      });
    return { success: true };
  });

export const maxAuthUrl = workspaceProcedure
  .input(z.object({ user_id: z.string() }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });
    const user = await usersService.getUser(input.user_id);
    if (!user)
      throw new ORPCError("NOT_FOUND", { message: "Пользователь не найден" });
    const token = randomBytes(16).toString("base64url");
    if (!(await usersService.saveMaxConnectToken(input.user_id, token)))
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось сохранить токен",
      });
    return {
      manual_instruction: `Отправьте боту команду: /start ${token}`,
      token,
    };
  });

export const disconnectMax = workspaceProcedure
  .input(z.object({ user_id: z.string() }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.user_id, context.workspaceRole)))
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому пользователю",
      });
    if (!(await usersService.disconnectMax(input.user_id)))
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Не удалось отключить MAX",
      });
    return { success: true };
  });
