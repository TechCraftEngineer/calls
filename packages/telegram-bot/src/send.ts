import { env } from "@calls/config/env";
import { Bot } from "grammy";

/**
 * Sends a text message to a Telegram chat.
 * @param token - Telegram Bot API token
 * @param chatId - Telegram chat ID (e.g. user's chat_id)
 * @param text - Message text
 * @param options - Additional options (parseMode)
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function sendMessage(
  token: string,
  chatId: string,
  text: string,
  options?: {
    parseMode?: "HTML" | "MarkdownV2";
  },
): Promise<boolean> {
  try {
    if (!token?.trim()) {
      console.error("[telegram-send] Bot token is empty");
      return false;
    }

    if (!chatId?.trim()) {
      console.error("[telegram-send] Chat ID is empty");
      return false;
    }

    if (!text?.trim()) {
      console.error("[telegram-send] Message text is empty");
      return false;
    }

    // Настраиваем прокси если указан в env
    const proxyUrl = env.TELEGRAM_PROXY_URL;
    const botConfig = proxyUrl
      ? {
          client: {
            baseFetchConfig: {
              fetch: createProxyFetch(proxyUrl),
            },
          },
        }
      : undefined;

    const bot = new Bot(token, botConfig);
    await bot.api.sendMessage(chatId, text, {
      parse_mode: options?.parseMode,
    });
    console.log(`[telegram-send] Message sent successfully to chat ${chatId}`);
    return true;
  } catch (error) {
    console.error("[telegram-send] Failed to send message:", error);

    // Логируем конкретные типы ошибок для лучшей диагностики
    if (error instanceof Error) {
      if (error.message.includes("chat not found")) {
        console.error(`[telegram-send] Chat ${chatId} not found or user hasn't started the bot`);
      } else if (error.message.includes("bot was blocked")) {
        console.error(`[telegram-send] Bot was blocked by user in chat ${chatId}`);
      } else if (error.message.includes("token")) {
        console.error("[telegram-send] Invalid bot token");
      }
    }

    return false;
  }
}

function createProxyFetch(proxyUrl: string): typeof fetch {
  return async (input, init) => {
    let url: string;
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else {
      url = input.url;
    }

    // Заменяем базовый URL Telegram API на URL прокси
    const proxyApiUrl = url.replace("https://api.telegram.org", proxyUrl);

    return fetch(proxyApiUrl, init);
  };
}
