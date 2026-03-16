import { Bot } from "grammy";

/**
 * Регистрирует webhook для бота Telegram.
 * @param token - токен бота
 * @param webhookUrl - полный URL (https://api.example.com/api/telegram-webhook/ws_xxx)
 */
export async function setTelegramWebhook(
  token: string,
  webhookUrl: string,
): Promise<void> {
  const bot = new Bot(token);
  await bot.api.setWebhook(webhookUrl);
}

/**
 * Удаляет webhook у бота Telegram.
 */
export async function deleteTelegramWebhook(token: string): Promise<void> {
  const bot = new Bot(token);
  await bot.api.deleteWebhook();
}
