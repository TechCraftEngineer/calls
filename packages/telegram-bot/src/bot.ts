import { storage } from "@calls/db";
import { Bot, webhookCallback } from "grammy";
import type { Context } from "hono";

export type GetTokenFn = () => Promise<string | null>;

/**
 * Creates a Hono-compatible webhook handler for the Telegram bot.
 * Handles /start with token to link user's Telegram chat_id.
 * Token is fetched lazily on each request (from prompts/settings).
 */
export function createWebhookHandler(getToken: GetTokenFn) {
  return async (c: Context) => {
    const token = await getToken();
    if (!token?.trim()) {
      return c.json({ error: "Telegram bot not configured" }, 503);
    }

    const bot = new Bot(token);

    bot.command("start", async (ctx) => {
      const payload = ctx.match?.trim();
      if (!payload) {
        await ctx.reply(
          "Отправьте ссылку из настроек приложения для подключения.",
        );
        return;
      }
      const user = await storage.getUserByTelegramConnectToken(payload);
      if (!user) {
        await ctx.reply("Ссылка недействительна или устарела.");
        return;
      }
      const saved = await storage.saveTelegramChatId(
        (user as { id: number }).id,
        String(ctx.chat.id),
      );
      if (saved) {
        await ctx.reply("Telegram успешно подключён.");
      } else {
        await ctx.reply("Ошибка при сохранении. Попробуйте позже.");
      }
    });

    const handler = webhookCallback(bot, "hono");
    return handler(c);
  };
}
