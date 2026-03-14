/**
 * Workspace integrations - universal table for PBX integrations.
 * Supports Megafon, Mango, Beeline, MTS and other providers.
 * Each integration can be enabled/disabled independently.
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

/** Supported PBX integration types */
export const INTEGRATION_TYPES = [
  "megafon_ftp",
  "mango",
  "beeline",
  "mts",
] as const;

export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

/** FTP-based config (Megafon and similar) */
export interface FtpIntegrationConfig {
  host: string;
  user: string;
  password: string;
}

/** Generic config for future integrations */
export type IntegrationConfig = FtpIntegrationConfig | Record<string, unknown>;

export const workspaceIntegrations = pgTable(
  "workspace_integrations",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    integrationType: text("integration_type")
      .$type<IntegrationType>()
      .notNull(),
    enabled: boolean("enabled").notNull().default(false),
    config: jsonb("config").$type<IntegrationConfig>().notNull().default({}),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("workspace_integrations_workspace_type_unique").on(
      table.workspaceId,
      table.integrationType,
    ),
    index("workspace_integrations_workspace_id_idx").on(table.workspaceId),
    index("workspace_integrations_type_idx").on(table.integrationType),
    index("workspace_integrations_workspace_type_idx").on(
      table.workspaceId,
      table.integrationType,
    ),
  ],
);
