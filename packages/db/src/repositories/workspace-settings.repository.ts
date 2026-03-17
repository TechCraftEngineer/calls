/**
 * Репозиторий настроек воркспейса — хранилище пар ключ‑значение
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";

export const workspaceSettingsRepository = {
  async findByKey(key: string, workspaceId: string): Promise<string | null> {
    try {
      if (!key?.trim() || !workspaceId?.trim()) {
        console.warn("Invalid parameters provided to findByKey:", {
          key,
          workspaceId,
        });
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
      console.error(
        `Ошибка при поиске настройки рабочей области: ${key} для рабочей области: ${workspaceId}`,
        error,
      );
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
        console.warn("Invalid parameters provided to findByKeyWithDefault:", {
          key,
          workspaceId,
        });
        return defaultValue ?? null;
      }

      const foundValue = await this.findByKey(key, workspaceId);
      return foundValue ?? defaultValue ?? null;
    } catch (error) {
      console.error(
        `Ошибка при поиске настройки рабочей области с умолчанием: ${key} для рабочей области: ${workspaceId}`,
        error,
      );
      return defaultValue ?? null;
    }
  },

  async findByKeys(
    keys: readonly string[],
    workspaceId: string,
  ): Promise<
    {
      key: string;
      value: string;
      description: string | null;
      updatedAt: Date | null;
    }[]
  > {
    try {
      if (!workspaceId?.trim() || keys.length === 0) {
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
        .where(
          and(
            eq(schema.workspaceSettings.workspaceId, workspaceId),
            inArray(schema.workspaceSettings.key, [...keys]),
          ),
        )
        .orderBy(schema.workspaceSettings.key);
    } catch (error) {
      console.error(
        `Ошибка при поиске настроек рабочей области по ключам для рабочей области: ${workspaceId}`,
        error,
      );
      return [];
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
      console.error(
        `Ошибка при поиске всех настроек рабочей области для рабочей области: ${workspaceId}`,
        error,
      );
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
        console.error("Некорректные параметры для upsert:", {
          key,
          workspaceId,
        });
        return false;
      }

      if (typeof value !== "string") {
        console.error(
          `Некорректный тип значения для ключа: ${key}, ожидается строка`,
        );
        return false;
      }

      const now = new Date();

      await db
        .insert(schema.workspaceSettings)
        .values({
          key,
          value,
          description: description ?? null,
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
            description: sql`COALESCE(excluded.description, workspace_settings.description)`,
            updatedAt: now,
          },
        });

      console.debug(
        `Successfully upserted workspace setting: ${key} for workspace: ${workspaceId}`,
      );
      return true;
    } catch (error) {
      console.error(
        `Не удалось обновить настройку рабочей области: ${key} для рабочей области: ${workspaceId}`,
        error,
      );
      return false;
    }
  },
};

export type WorkspaceSettingsRepository = typeof workspaceSettingsRepository;
