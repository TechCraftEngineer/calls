import { pbxService } from "@calls/db";
import { generateSecureSecret } from "@calls/shared";
import { workspaceAdminProcedure } from "../../../orpc";

/**
 * Get or generate webhook secret for PBX integration.
 * Returns existing secret if set, otherwise generates and persists a new one.
 */
export const getPbxWebhookSecret = workspaceAdminProcedure.handler(async ({ context }) => {
  const existingConfig = await pbxService.getConfigWithSecrets(context.workspaceId);

  // Return existing secret if available
  if (existingConfig?.webhook?.secret) {
    return {
      webhookSecret: existingConfig.webhook.secret,
      isNew: false,
    };
  }

  // Generate a new secret and persist it
  const newSecret = generateSecureSecret(32);
  const username = context.user?.email ?? "system";

  await pbxService.updateWebhook(
    context.workspaceId,
    { webhookSecret: newSecret },
    String(username),
  );

  return {
    webhookSecret: newSecret,
    isNew: true,
  };
});
