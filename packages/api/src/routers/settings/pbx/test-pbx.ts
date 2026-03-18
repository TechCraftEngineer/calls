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
      authScheme: input.authScheme ?? saved?.authScheme ?? "bearer",
      apiKeyHeader:
        input.apiKeyHeader?.trim() || saved?.apiKeyHeader || "X-API-Key",
      employeesEndpoint:
        input.employeesPath?.trim() || saved?.employeesEndpoint?.path
          ? {
              path:
                input.employeesPath?.trim() ||
                saved?.employeesEndpoint?.path ||
                "",
              method:
                input.employeesMethod ??
                saved?.employeesEndpoint?.method ??
                "GET",
              resultKey:
                input.employeesResultKey?.trim() ||
                saved?.employeesEndpoint?.resultKey,
            }
          : undefined,
      numbersEndpoint:
        input.numbersPath?.trim() || saved?.numbersEndpoint?.path
          ? {
              path:
                input.numbersPath?.trim() || saved?.numbersEndpoint?.path || "",
              method:
                input.numbersMethod ?? saved?.numbersEndpoint?.method ?? "GET",
              resultKey:
                input.numbersResultKey?.trim() ||
                saved?.numbersEndpoint?.resultKey,
            }
          : undefined,
      callsEndpoint:
        input.callsPath?.trim() || saved?.callsEndpoint?.path
          ? {
              path: input.callsPath?.trim() || saved?.callsEndpoint?.path || "",
              method:
                input.callsMethod ?? saved?.callsEndpoint?.method ?? "GET",
              resultKey:
                input.callsResultKey?.trim() || saved?.callsEndpoint?.resultKey,
            }
          : undefined,
      recordingsEndpoint:
        input.recordingsPath?.trim() || saved?.recordingsEndpoint?.path
          ? {
              path:
                input.recordingsPath?.trim() ||
                saved?.recordingsEndpoint?.path ||
                "",
              method:
                input.recordingsMethod ??
                saved?.recordingsEndpoint?.method ??
                "GET",
              resultKey:
                input.recordingsResultKey?.trim() ||
                saved?.recordingsEndpoint?.resultKey,
            }
          : undefined,
      webhook: {
        path: input.webhookPath?.trim() || saved?.webhook?.path,
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
