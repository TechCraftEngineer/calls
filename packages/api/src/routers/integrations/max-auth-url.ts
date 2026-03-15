import { randomBytes } from "node:crypto";
import { usersService } from "@calls/db";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";
import { canAccessUser } from "./utils";

export const maxAuthUrl = workspaceProcedure
  .input(z.object({ user_id: z.string() }))
  .handler(async ({ input, context }) => {
    const userId = (context.user as Record<string, unknown>).id as string;
    if (!(await canAccessUser(userId, input.user_id)))
      throw new Error("Not authorized");
    const user = await usersService.getUser(input.user_id);
    if (!user) throw new Error("User not found");
    const token = randomBytes(16).toString("base64url");
    if (
      !(await usersService.saveMaxConnectToken(
        input.user_id,
        context.workspaceId!,
        token,
      ))
    )
      throw new Error("Failed to save token");
    return {
      manual_instruction: `Отправьте боту команду: /start ${token}`,
      token,
    };
  });
