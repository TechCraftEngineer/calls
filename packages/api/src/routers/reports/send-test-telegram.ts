import { promptsRepository, usersService } from "@calls/db";
import { sendMessage } from "@calls/telegram-bot";
import { workspaceProcedure } from "../../orpc";

export const sendTestTelegram = workspaceProcedure.handler(
  async ({ context }) => {
    const { workspaceId } = context;
    const username = (context.user as Record<string, unknown>)
      .username as string;
    const user = await usersService.getUserByUsername(username);
    if (!user) throw new Error("User not found");
    const chatId = (user as Record<string, unknown>).telegramChatId as
      | string
      | undefined;
    if (!chatId) throw new Error("Telegram Chat ID is not set for this user");
    const token = await promptsRepository.findByKeyWithDefault(
      "telegram_bot_token",
      workspaceId,
    );
    if (!token?.trim())
      throw new Error(
        "Telegram Bot Token не настроен. Укажите токен в Настройках.",
      );
    const success = await sendMessage(token, chatId, "Тестовый отчёт");
    if (!success) {
      throw new Error(
        "Не удалось отправить сообщение в Telegram. Проверьте настройки и подключение.",
      );
    }
    return { success: true };
  },
);
