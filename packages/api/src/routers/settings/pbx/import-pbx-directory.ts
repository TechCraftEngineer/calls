import { pbxService } from "@calls/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { workspaceAdminProcedure } from "../../../orpc";

const importPbxDirectoryInputSchema = z.object({
  employeeIds: z.array(z.string()),
  numberIds: z.array(z.string()),
});

export const importPbxDirectory = workspaceAdminProcedure
  .input(importPbxDirectoryInputSchema)
  .handler(async ({ input, context }) => {
    const config = await pbxService.getConfigWithSecrets(context.workspaceId);
    if (!config) {
      throw new ORPCError("NOT_FOUND", {
        message: "PBX интеграция не настроена",
      });
    }

    try {
      // Get current lists from PBX to find full data for selected items
      const employees = await pbxService.listEmployees(context.workspaceId);
      const numbers = await pbxService.listNumbers(context.workspaceId);

      // Filter selected items
      const selectedEmployees = employees.filter((e) => input.employeeIds.includes(e.id));
      const selectedNumbers = numbers.filter((n) => input.numberIds.includes(n.id));

      // Import to database
      if (selectedEmployees.length > 0) {
        await pbxService.upsertEmployees(
          context.workspaceId,
          selectedEmployees.map((e) => ({
            externalId: e.id,
            extension: e.extension ?? null,
            email: e.email ?? null,
            firstName: e.firstName ?? null,
            lastName: e.lastName ?? null,
            displayName: e.displayName,
            isActive: e.isActive ?? true,
            rawData: e,
          })),
        );
      }

      if (selectedNumbers.length > 0) {
        await pbxService.upsertNumbers(
          context.workspaceId,
          selectedNumbers.map((n) => ({
            externalId: n.id,
            phoneNumber: n.phoneNumber,
            extension: n.extension ?? null,
            label: n.label ?? null,
            lineType: n.lineType ?? null,
            employeeExternalId: n.employee?.externalId ?? null,
            isActive: n.isActive ?? true,
            rawData: n,
          })),
        );
      }

      return {
        success: true,
        importedEmployees: selectedEmployees.length,
        importedNumbers: selectedNumbers.length,
      };
    } catch (error) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Ошибка при импорте данных",
        cause: error,
      });
    }
  });
