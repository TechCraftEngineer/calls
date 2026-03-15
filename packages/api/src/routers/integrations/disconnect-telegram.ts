import { usersService } from "@calls/db";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";
import { canAccessUser } from "./utils";

export const disconnectTelegram = workspaceProcedure
  .input(z.object({ user_id: z.string() }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.user_id)))
      throw new Error("Not authorized");
    if (!(await usersService.disconnectTelegram(input.user_id)))
      throw new Error("Failed to disconnect Telegram");
    return { success: true };
  });
