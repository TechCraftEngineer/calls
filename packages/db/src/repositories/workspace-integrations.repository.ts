/**
 * Workspace integrations repository - universal PBX integrations
 */

import { and, eq } from "drizzle-orm";
import { db } from "../client";
import type { FtpIntegrationConfig, IntegrationType } from "../schema";
import * as schema from "../schema";

export type ActiveFtpIntegration = {
  workspaceId: string;
  host: string;
  user: string;
  password: string;
  syncFromDate: string;
};

export const workspaceIntegrationsRepository = {
  /** Список активных интеграций FTP (enabled + валидный config) */
  async listActiveFtp(): Promise<ActiveFtpIntegration[]> {
    const rows = await db
      .select({
        workspaceId: schema.workspaceIntegrations.workspaceId,
        config: schema.workspaceIntegrations.config,
      })
      .from(schema.workspaceIntegrations)
      .where(
        and(
          eq(schema.workspaceIntegrations.integrationType, "ftp"),
          eq(schema.workspaceIntegrations.enabled, true),
        ),
      );

    const result: ActiveFtpIntegration[] = [];
    const defaultFromDate = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().slice(0, 10);
    })();
    for (const row of rows) {
      const cfg = row.config as {
        host?: string;
        user?: string;
        password?: string;
        syncDaysBack?: number;
        syncFromDate?: string;
      };
      if (cfg?.host && cfg?.user && cfg?.password) {
        let syncFromDate = defaultFromDate;
        if (
          typeof cfg.syncFromDate === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(cfg.syncFromDate)
        ) {
          syncFromDate = cfg.syncFromDate;
        } else if (
          typeof cfg.syncDaysBack === "number" &&
          cfg.syncDaysBack >= 1
        ) {
          const d = new Date();
          d.setDate(d.getDate() - cfg.syncDaysBack);
          syncFromDate = d.toISOString().slice(0, 10);
        }
        result.push({
          workspaceId: row.workspaceId,
          host: cfg.host,
          user: cfg.user,
          password: cfg.password,
          syncFromDate,
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
