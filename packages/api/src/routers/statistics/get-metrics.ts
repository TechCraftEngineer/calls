import { workspaceProcedure } from "../../orpc";

export const getMetrics = workspaceProcedure.handler(async ({ context }) => {
  return await context.callsService.calculateMetrics(context.workspaceId);
});
