/**
 * Workspace integrations - PBX integrations (Megafon, Mango, Beeline, MTS)
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

/** Поддерживаемые типы интеграций */
export const INTEGRATION_TYPES = [
  "ftp",
  "mango",
  "beeline",
  "mts",
  "telegram",
  "max",
] as const;

export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

/** FTP-based config (Megafon and similar) */
export interface FtpIntegrationConfig {
  host: string;
  user: string;
  password: string;
  /** С какой даты выгружать записи (YYYY-MM-DD). По умолчанию — неделя назад */
  syncFromDate?: string;
}

/** Config для Telegram/MAX ботов — botToken хранится зашифрованным */
export interface BotIntegrationConfig {
  botToken: string;
}

/** Универсальный конфиг для будущих интеграций */
export type IntegrationConfig =
  | FtpIntegrationConfig
  | BotIntegrationConfig
  | Record<string, unknown>;

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
