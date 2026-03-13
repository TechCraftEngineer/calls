import { z } from "zod";
import { protectedProcedure } from "../orpc";
import { generateRecommendations } from "./recommendations";

export const recommendationsRouter = {
  generate: protectedProcedure
    .input(z.object({ call_id: z.number() }))
    .handler(async ({ input, context }) => {
      return generateRecommendations(
        input.call_id,
        context.callsService,
        context.promptsService,
      );
    }),
};
