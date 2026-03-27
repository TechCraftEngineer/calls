/**
 * Валидация токена Telegram-бота.
 * Формат: цифры:буквенно-цифровая строка (например: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz)
 * @see https://core.telegram.org/bots/features#creating-a-new-bot
 */

// Telegram токены не всегда строго 10 цифр до ":" и 35 символов после него.
// Делаем валидацию совместимой с серверной (settingsService.isValidTelegramToken).
const TELEGRAM_BOT_TOKEN_REGEX = /^\d+:[A-Za-z0-9_-]{35,}$/;

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
        "Неверный формат токена. Ожидается вид: <числа>:<строка_из_букв_цифр_-_или_>.",
    };
  }

  return { isValid: true };
}
