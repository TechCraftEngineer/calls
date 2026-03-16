import { disconnectMax } from "./disconnect-max";
import { disconnectTelegram } from "./disconnect-telegram";
import { maxAuthUrl } from "./max-auth-url";
import { telegramAuthUrl } from "./telegram-auth-url";

export const integrationsRouter = {
  telegramAuthUrl,
  disconnectTelegram,
  maxAuthUrl,
  disconnectMax,
};
