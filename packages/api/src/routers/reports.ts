import { storage } from "@calls/db";
import { protectedProcedure } from "../orpc";

export const reportsRouter = {
  sendTestTelegram: protectedProcedure.handler(async ({ context }) => {
    const username = (context.user as Record<string, unknown>)
      .username as string;
    const user = await storage.getUserByUsername(username);
    if (!user) throw new Error("User not found");
    const chatId = (user as Record<string, unknown>).telegram_chat_id as
      | string
      | undefined;
    if (!chatId) throw new Error("Telegram Chat ID is not set for this user");
    // TODO: integrate TelegramService.send_message - for now stub
    throw new Error(
      "Telegram service not yet integrated - add TelegramService.send_message",
    );
  }),
};
