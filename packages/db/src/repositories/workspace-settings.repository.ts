/**
 * Workspace settings repository - key-value настройки воркспейса
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";

export const workspaceSettingsRepository = {
  async findByKey(key: string, workspaceId: string): Promise<string | null> {
    try {
      if (!key?.trim() || !workspaceId?.trim()) {
        console.warn("Invalid parameters provided to findByKey:", { key, workspaceId });
        return null;
      }

      const result = await db
        .select()
        .from(schema.workspaceSettings)
        .where(
          and(
            eq(schema.workspaceSettings.key, key),
            eq(schema.workspaceSettings.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      return result[0]?.value ?? null;
    } catch (error) {
      console.error(`Error finding workspace setting: ${key} for workspace: ${workspaceId}`, error);
      return null;
    }
  },

  async findByKeyWithDefault(
    key: string,
    workspaceId: string,
    defaultValue?: string,
  ): Promise<string | null> {
    try {
      if (!key?.trim() || !workspaceId?.trim()) {
        console.warn("Invalid parameters provided to findByKeyWithDefault:", { key, workspaceId });
        return defaultValue ?? null;
      }

      const result = await db
        .select()
        .from(schema.workspaceSettings)
        .where(
          and(
            eq(schema.workspaceSettings.key, key),
            eq(schema.workspaceSettings.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      return result[0]?.value ?? defaultValue ?? null;
    } catch (error) {
      console.error(`Error finding workspace setting with default: ${key} for workspace: ${workspaceId}`, error);
      return defaultValue ?? null;
    }
  },

  async findAll(workspaceId: string): Promise<
    {
      key: string;
      value: string;
      description: string | null;
      updatedAt: Date | null;
    }[]
  > {
    try {
      if (!workspaceId?.trim()) {
        console.warn("Invalid workspaceId provided to findAll");
        return [];
      }

      return await db
        .select({
          key: schema.workspaceSettings.key,
          value: schema.workspaceSettings.value,
          description: schema.workspaceSettings.description,
          updatedAt: schema.workspaceSettings.updatedAt,
        })
        .from(schema.workspaceSettings)
        .where(eq(schema.workspaceSettings.workspaceId, workspaceId))
        .orderBy(schema.workspaceSettings.key);
    } catch (error) {
      console.error(`Error finding all workspace settings for workspace: ${workspaceId}`, error);
      return [];
    }
  },

  async upsert(
    key: string,
    value: string,
    description: string | null,
    workspaceId: string,
  ): Promise<boolean> {
    try {
      if (!key?.trim() || !workspaceId?.trim()) {
        console.error("Invalid parameters provided to upsert:", { key, workspaceId });
        return false;
      }

      if (typeof value !== "string") {
        console.error(`Invalid value type for key: ${key}, expected string`);
        return false;
      }

      const now = new Date();

      await db.transaction(async (tx) => {
        // Use ON CONFLICT DO UPDATE to handle race conditions atomically
        await tx
          .insert(schema.workspaceSettings)
          .values({
            key,
            value,
            description: description ?? "",
            updatedAt: now,
            workspaceId,
          })
          .onConflictDoUpdate({
            target: [
              schema.workspaceSettings.workspaceId,
              schema.workspaceSettings.key,
            ],
            set: {
              value,
              description: description ?? sql`workspace_settings.description`,
              updatedAt: now,
            },
          });
      });
      
      console.log(`Successfully upserted workspace setting: ${key} for workspace: ${workspaceId}`);
      return true;
    } catch (error) {
      console.error(`Failed to upsert workspace setting: ${key} for workspace: ${workspaceId}`, error);
      return false;
    }
  },
};

export type WorkspaceSettingsRepository = typeof workspaceSettingsRepository;
