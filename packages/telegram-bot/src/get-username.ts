import { Bot } from "grammy";

/**
 * Gets the bot username from Telegram API (getMe).
 * Used to build t.me/username links.
 */
export async function getBotUsername(token: string): Promise<string> {
  const bot = new Bot(token);
  const me = await bot.api.getMe();
  if (!me.username) {
    throw new Error("Bot has no username configured");
  }
  return me.username;
}
