import { randomBytes } from "node:crypto";
import { promptsService, usersService } from "@calls/db";
import { getBotUsername } from "@calls/telegram-bot";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";
import { canAccessUser } from "./utils";

export const telegramAuthUrl = workspaceProcedure
  .input(z.object({ user_id: z.string() }))
  .handler(async ({ input, context }) => {
    const { workspaceId } = context;
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.user_id)))
      throw new Error("Not authorized");
    const user = await usersService.getUser(input.user_id);
    if (!user) throw new Error("User not found");
    const token = randomBytes(16).toString("base64url");
    if (
      !(await usersService.saveTelegramConnectToken(
        input.user_id,
        workspaceId,
        token,
      ))
    )
      throw new Error("Failed to save token");
    const botToken = await promptsService.getPrompt(
      "telegram_bot_token",
      workspaceId,
    );
    const botUsername = botToken?.trim()
      ? await getBotUsername(botToken)
      : "mango_react_bot";
    return { url: `https://t.me/${botUsername}?start=${token}` };
  });
