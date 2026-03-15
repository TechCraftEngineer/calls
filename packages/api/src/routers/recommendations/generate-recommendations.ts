import { z } from "zod";
import { protectedProcedure } from "../../orpc";
import { generateRecommendations } from "./impl";

export const generate = protectedProcedure
  .input(z.object({ call_id: z.string() }))
  .handler(async ({ input, context }) => {
    return generateRecommendations(input.call_id, context.callsService);
  });
