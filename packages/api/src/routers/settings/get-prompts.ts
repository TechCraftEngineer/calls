import { promptsService } from "@calls/db";
import { workspaceProcedure } from "../../orpc";

export const getPrompts = workspaceProcedure.handler(async ({ context }) => {
  return await promptsService.getAllPrompts(context.workspaceId);
});
