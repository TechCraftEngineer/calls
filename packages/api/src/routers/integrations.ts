import { randomBytes } from "node:crypto";
import { storage } from "@calls/db";
import { getBotUsername } from "@calls/telegram-bot";
import { z } from "zod";
import { protectedProcedure } from "../orpc";

async function canAccessUser(
  currentUserId: number,
  targetUserId: number,
): Promise<boolean> {
  if (currentUserId === targetUserId) return true;
  const user = await storage.getUser(currentUserId);
  if (!user) return false;
  const adminUsernames = ["admin@mango", "admin@gmail.com"];
  return adminUsernames.includes((user.username as string) ?? "");
}

export const integrationsRouter = {
  telegramAuthUrl: protectedProcedure
    .input(z.object({ user_id: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as number;
      if (!(await canAccessUser(userId, input.user_id)))
        throw new Error("Not authorized");
      const user = await storage.getUser(input.user_id);
      if (!user) throw new Error("User not found");
      const token = randomBytes(16).toString("base64url");
      if (!(await storage.saveTelegramConnectToken(input.user_id, token)))
        throw new Error("Failed to save token");
      const botToken = await storage.getPrompt("telegram_bot_token");
      const botUsername = botToken?.trim()
        ? await getBotUsername(botToken)
        : "mango_react_bot";
      return { url: `https://t.me/${botUsername}?start=${token}` };
    }),

  disconnectTelegram: protectedProcedure
    .input(z.object({ user_id: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as number;
      if (!(await canAccessUser(userId, input.user_id)))
        throw new Error("Not authorized");
      if (!(await storage.disconnectTelegram(input.user_id)))
        throw new Error("Failed to disconnect Telegram");
      return { success: true };
    }),

  maxAuthUrl: protectedProcedure
    .input(z.object({ user_id: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as number;
      if (!(await canAccessUser(userId, input.user_id)))
        throw new Error("Not authorized");
      const user = await storage.getUser(input.user_id);
      if (!user) throw new Error("User not found");
      const token = randomBytes(16).toString("base64url");
      if (!(await storage.saveMaxConnectToken(input.user_id, token)))
        throw new Error("Failed to save token");
      return {
        manual_instruction: `Отправьте боту команду: /start ${token}`,
        token,
      };
    }),

  disconnectMax: protectedProcedure
    .input(z.object({ user_id: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = (context.user as Record<string, unknown>).id as number;
      if (!(await canAccessUser(userId, input.user_id)))
        throw new Error("Not authorized");
      if (!(await storage.disconnectMax(input.user_id)))
        throw new Error("Failed to disconnect MAX");
      return { success: true };
    }),
};
