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

export type ActiveMegafonFtpIntegration = {
  workspaceId: string;
  host: string;
  user: string;
  password: string;
};

export const workspaceIntegrationsRepository = {
  /** Список активных интеграций Megafon FTP (enabled + валидный config) */
  async listActiveMegafonFtp(): Promise<ActiveMegafonFtpIntegration[]> {
    const rows = await db
      .select({
        workspaceId: schema.workspaceIntegrations.workspaceId,
        config: schema.workspaceIntegrations.config,
      })
      .from(schema.workspaceIntegrations)
      .where(
        and(
          eq(schema.workspaceIntegrations.integrationType, "megafon_ftp"),
          eq(schema.workspaceIntegrations.enabled, true),
        ),
      );

    const result: ActiveMegafonFtpIntegration[] = [];
    for (const row of rows) {
      const cfg = row.config as {
        host?: string;
        user?: string;
        password?: string;
      };
      if (cfg?.host && cfg?.user && cfg?.password) {
        result.push({
          workspaceId: row.workspaceId,
          host: cfg.host,
          user: cfg.user,
          password: cfg.password,
        });
      }
    }
    return result;
  },

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
