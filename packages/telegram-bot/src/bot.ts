import { usersService } from "@calls/db";
import { Bot, webhookCallback } from "grammy";
import type { Context } from "hono";

export type GetTokenFn = () => Promise<string | null>;

// Кэш для экземпляров ботов по токену
const botCache = new Map<string, Bot>();

// Валидация payload токена
function isValidConnectToken(payload: string): boolean {
  // Проверяем, что payload состоит только из безопасных символов
  // и имеет разумную длину (16-64 символа)
  return /^[a-zA-Z0-9_-]{16,64}$/.test(payload);
}

/**
 * Creates a Hono-compatible webhook handler for the Telegram bot.
 * Handles /start with token to link user's Telegram chat_id.
 * Token is fetched lazily on each request (from prompts/settings).
 */
export function createWebhookHandler(getToken: GetTokenFn) {
  return async (c: Context) => {
    const token = await getToken();
    if (!token?.trim()) {
      console.warn("[telegram-webhook] Bot token not configured");
      return c.json({ error: "Telegram bot not configured" }, 503);
    }

    // Используем кэшированный экземпляр бота или создаем новый
    let bot = botCache.get(token);
    if (!bot) {
      try {
        bot = new Bot(token);
        botCache.set(token, bot);
        console.log("[telegram-webhook] Created new bot instance for token");
      } catch (error) {
        console.error("[telegram-webhook] Failed to create bot instance:", error);
        return c.json({ error: "Invalid bot token" }, 400);
      }
    }

    bot.command("start", async (ctx) => {
      try {
        const payload = ctx.match?.trim();

        // Валидация payload
        if (!payload) {
          await ctx.reply("Отправьте ссылку из настроек приложения для подключения.");
          return;
        }

        if (!isValidConnectToken(payload)) {
          console.warn(`[telegram-webhook] Invalid token format: ${payload}`);
          await ctx.reply("Неверный формат ссылки. Используйте ссылку из настроек приложения.");
          return;
        }

        const user = await usersService.getUserByTelegramConnectToken(payload);
        if (!user) {
          console.warn(`[telegram-webhook] User not found for token: ${payload}`);
          await ctx.reply("Ссылка недействительна или устарела.");
          return;
        }

        const saved = await usersService.saveTelegramChatId(user.id, String(ctx.chat.id));

        if (saved) {
          console.log(`[telegram-webhook] Successfully connected Telegram for user ${user.id}`);
          await ctx.reply("Telegram успешно подключён.");
        } else {
          console.error(`[telegram-webhook] Failed to save chat ID for user ${user.id}`);
          await ctx.reply("Ошибка при сохранении. Попробуйте позже.");
        }
      } catch (error) {
        console.error("[telegram-webhook] Error in /start command:", error);
        await ctx.reply("Произошла ошибка. Попробуйте позже.");
      }
    });

    try {
      const handler = webhookCallback(bot, "hono");
      return await handler(c);
    } catch (error) {
      console.error("[telegram-webhook] Webhook handler error:", error);
      return c.json({ error: "Webhook processing failed" }, 500);
    }
  };
}
