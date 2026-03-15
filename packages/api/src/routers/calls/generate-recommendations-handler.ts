import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceProcedure } from "../../orpc";
import { generateRecommendations } from "./generate-recommendations";

export const generateRecommendationsHandler = workspaceProcedure
  .input(z.object({ call_id: z.string() }))
  .handler(async ({ input, context }) => {
    const call = await context.callsService.getCall(input.call_id);
    if (call && call.workspaceId !== context.workspaceId) {
      throw new ORPCError("FORBIDDEN", {
        message: "Нет доступа к этому звонку",
      });
    }
    return generateRecommendations(
      input.call_id,
      context.callsService,
      context.promptsService,
      context.workspaceId!,
    );
  });
