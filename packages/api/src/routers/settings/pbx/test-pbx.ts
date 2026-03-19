import { pbxService } from "@calls/db";
import { testPbxConnection } from "@calls/jobs";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../../orpc";
import { testPbxInputSchema } from "./schemas";

export const testPbx = workspaceAdminProcedure
  .input(testPbxInputSchema)
  .handler(async ({ input, context }) => {
    const saved = await pbxService.getConfigWithSecrets(context.workspaceId);
    const baseUrl = (input.baseUrl || saved?.baseUrl || "").trim();
    const apiKey = (input.apiKey || saved?.apiKey || "").trim();

    if (!baseUrl || !apiKey) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Нужно указать base URL и API key PBX",
      });
    }

    return testPbxConnection({
      baseUrl,
      apiKey,
    });
  });
