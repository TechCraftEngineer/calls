import { Bot } from "grammy";

/**
 * Sends a text message to a Telegram chat.
 * @param token - Telegram Bot API token
 * @param chatId - Telegram chat ID (e.g. user's chat_id)
 * @param text - Message text
 */
export async function sendMessage(
  token: string,
  chatId: string,
  text: string,
): Promise<void> {
  const bot = new Bot(token);
  await bot.api.sendMessage(chatId, text);
}
