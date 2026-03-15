/**
 * Валидация токена Telegram-бота.
 * Формат: цифры:буквенно-цифровая строка (например: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz)
 * @see https://core.telegram.org/bots/features#creating-a-new-bot
 */

const TELEGRAM_BOT_TOKEN_REGEX = /^\d{8,10}:[A-Za-z0-9_-]{35}$/;

export function validateTelegramBotToken(token?: string | null): {
  isValid: boolean;
  error?: string;
} {
  if (!token || token.trim().length === 0) {
    return { isValid: true }; // пустое — допустимо (интеграция отключена)
  }

  const trimmed = token.trim();

  if (!TELEGRAM_BOT_TOKEN_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error:
        "Неверный формат токена. Ожидается вид: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
    };
  }

  return { isValid: true };
}
