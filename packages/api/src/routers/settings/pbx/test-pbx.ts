import { pbxService } from "@calls/db";
import { testPbxConnection } from "@calls/jobs";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../../orpc";
import { pbxSettingsSchema } from "./schemas";

export const testPbx = workspaceAdminProcedure
  .input(
    pbxSettingsSchema
      .partial()
      .extend({ enabled: pbxSettingsSchema.shape.enabled.optional() }),
  )
  .handler(async ({ input, context }) => {
    const saved = await pbxService.getConfigWithSecrets(context.workspaceId);

    const config = {
      baseUrl: (input.baseUrl?.trim() || saved?.baseUrl || "").trim(),
      apiKey: (input.apiKey?.trim() || saved?.apiKey || "").trim(),
      authScheme: "bearer" as const,
      employeesEndpoint: {
        path: "/crm/employees",
        method: "GET" as const,
      },
      numbersEndpoint: {
        path: "/crm/numbers",
        method: "GET" as const,
      },
      callsEndpoint: {
        path: "/crm/calls",
        method: "GET" as const,
      },
      webhook: {
        secret: input.webhookSecret?.trim() || saved?.webhook?.secret,
      },
      ftpHost: input.ftpHost?.trim() || saved?.ftpHost,
      ftpUser: input.ftpUser?.trim() || saved?.ftpUser,
      ftpPassword: input.ftpPassword?.trim() || saved?.ftpPassword,
      syncEmployees: input.syncEmployees ?? saved?.syncEmployees ?? true,
      syncNumbers: input.syncNumbers ?? saved?.syncNumbers ?? true,
      syncCalls: input.syncCalls ?? saved?.syncCalls ?? true,
      syncRecordings: input.syncRecordings ?? saved?.syncRecordings ?? false,
      webhooksEnabled: input.webhooksEnabled ?? saved?.webhooksEnabled ?? false,
    };

    if (!config.baseUrl || !config.apiKey) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Нужно указать base URL и API key PBX",
      });
    }

    return testPbxConnection(config);
  });
