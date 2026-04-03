/**
 * Определение менеджера из PBX интеграции
 */

import { pbxRepository, workspaceIntegrationsRepository } from "@calls/db";
import { createLogger } from "../../../logger";

const logger = createLogger("manager-resolution");

export async function resolveManagerFromPbx(call: {
  workspaceId: string;
  internalNumber?: string | null;
}): Promise<string | null> {
  try {
    const pbxIntegration = await workspaceIntegrationsRepository.getByWorkspaceAndType(
      call.workspaceId,
      "megapbx",
    );

    if (!pbxIntegration?.enabled) {
      return null;
    }

    const rawProvider =
      typeof pbxIntegration.config === "object" &&
      pbxIntegration.config !== null &&
      "provider" in pbxIntegration.config
        ? pbxIntegration.config.provider
        : undefined;
    const integrationProvider = typeof rawProvider === "string" ? rawProvider.trim() : "megapbx";

    if (!integrationProvider) {
      logger.warn("PBX integration provider is missing", {
        workspaceId: call.workspaceId,
      });
      return null;
    }

    const pbxNumbers = await pbxRepository.listNumbers(call.workspaceId, integrationProvider);
    const activePbxNumbers = pbxNumbers.filter((number) => number.isActive);
    const normalizedInternalNumber = call.internalNumber?.trim() || null;

    const matchedByInternalNumber = normalizedInternalNumber
      ? activePbxNumbers.find(
          (number) => (number.extension?.trim() || null) === normalizedInternalNumber,
        )
      : undefined;

    const matchedNumber = matchedByInternalNumber;
    const managerName =
      matchedNumber?.label?.trim() ||
      matchedNumber?.extension?.trim() ||
      matchedNumber?.phoneNumber?.trim() ||
      null;

    return managerName;
  } catch (error) {
    logger.warn("Не удалось определить менеджера из pbx_numbers", {
      workspaceId: call.workspaceId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
