import { pbxService } from "@calls/db";
import { syncPbxDirectory } from "@calls/jobs";
import { ORPCError } from "@orpc/server";
import { workspaceAdminProcedure } from "../../../orpc";

export const syncPbxDirectoryRoute = workspaceAdminProcedure.handler(async ({ context }) => {
  const config = await pbxService.getConfigWithSecrets(context.workspaceId);

  if (!config) {
    throw new ORPCError("NOT_FOUND", {
      message: "PBX интеграция не настроена",
    });
  }

  try {
    // Синхронная синхронизация справочника
    const stats = await syncPbxDirectory(context.workspaceId, config);

    return {
      success: true,
      message: `Синхронизировано ${stats.employees} сотрудников и ${stats.numbers} номеров`,
      stats: {
        employees: stats.employees,
        numbers: stats.numbers,
      },
    };
  } catch (err) {
    if (err instanceof ORPCError) {
      throw err;
    }
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Не удалось синхронизировать справочник PBX",
      cause: err,
    });
  }
});
