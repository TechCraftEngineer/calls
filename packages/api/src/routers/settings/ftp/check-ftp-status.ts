import { settingsService } from "@calls/db";
import { testFtpConnection } from "@calls/jobs";
import { workspaceProcedure } from "../../../orpc";

export const checkFtpStatus = workspaceProcedure.handler(
  async ({ context }) => {
    const config = await settingsService.getFtpConfigWithPassword(
      context.workspaceId,
    );
    if (!config) {
      return {
        configured: false,
        success: null,
        message: null,
      };
    }
    const result = await testFtpConnection(config);
    if (result.success) {
      return {
        configured: true,
        success: true,
        message: "Подключено",
      };
    }
    return {
      configured: true,
      success: false,
      message: result.error,
    };
  },
);
