/**
 * Workspace integrations repository - universal PBX integrations
 */

import { and, eq } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";
import type {
  FtpIntegrationConfig,
  IntegrationType,
} from "../schema/workspace-integrations";

export const workspaceIntegrationsRepository = {
  async getByWorkspaceAndType(
    workspaceId: string,
    integrationType: IntegrationType,
  ): Promise<{
    enabled: boolean;
    config: FtpIntegrationConfig | Record<string, unknown>;
  } | null> {
    const result = await db
      .select()
      .from(schema.workspaceIntegrations)
      .where(
        and(
          eq(schema.workspaceIntegrations.workspaceId, workspaceId),
          eq(schema.workspaceIntegrations.integrationType, integrationType),
        ),
      )
      .limit(1);

    const row = result[0];
    if (!row) return null;

    return {
      enabled: row.enabled,
      config: (row.config ?? {}) as
        | FtpIntegrationConfig
        | Record<string, unknown>,
    };
  },

  async upsert(
    workspaceId: string,
    integrationType: IntegrationType,
    enabled: boolean,
    config: FtpIntegrationConfig | Record<string, unknown>,
  ): Promise<boolean> {
    const existing = await db
      .select()
      .from(schema.workspaceIntegrations)
      .where(
        and(
          eq(schema.workspaceIntegrations.workspaceId, workspaceId),
          eq(schema.workspaceIntegrations.integrationType, integrationType),
        ),
      )
      .limit(1);

    const now = new Date();

    if (existing[0]) {
      const result = await db
        .update(schema.workspaceIntegrations)
        .set({ enabled, config, updatedAt: now })
        .where(
          and(
            eq(schema.workspaceIntegrations.workspaceId, workspaceId),
            eq(schema.workspaceIntegrations.integrationType, integrationType),
          ),
        );
      return (result.rowCount ?? 0) > 0;
    }

    await db.insert(schema.workspaceIntegrations).values({
      workspaceId,
      integrationType,
      enabled,
      config,
      updatedAt: now,
    });
    return true;
  },

  async setEnabled(
    workspaceId: string,
    integrationType: IntegrationType,
    enabled: boolean,
  ): Promise<boolean> {
    const result = await db
      .update(schema.workspaceIntegrations)
      .set({ enabled, updatedAt: new Date() })
      .where(
        and(
          eq(schema.workspaceIntegrations.workspaceId, workspaceId),
          eq(schema.workspaceIntegrations.integrationType, integrationType),
        ),
      );
    return (result.rowCount ?? 0) > 0;
  },
};

export type WorkspaceIntegrationsRepository =
  typeof workspaceIntegrationsRepository;
