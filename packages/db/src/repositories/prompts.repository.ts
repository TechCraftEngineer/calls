/**
 * Prompts repository - handles all database operations for prompts
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";

export const promptsRepository = {
  async findByKey(key: string, workspaceId: string): Promise<string | null> {
    const result = await db
      .select()
      .from(schema.prompts)
      .where(
        and(
          eq(schema.prompts.key, key),
          eq(schema.prompts.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    return result[0]?.value ?? null;
  },

  async findByKeyWithDefault(
    key: string,
    workspaceId: string,
    defaultValue?: string,
  ): Promise<string | null> {
    const result = await db
      .select()
      .from(schema.prompts)
      .where(
        and(
          eq(schema.prompts.key, key),
          eq(schema.prompts.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    return result[0]?.value ?? defaultValue ?? null;
  },

  async findAll(workspaceId: string): Promise<
    {
      key: string;
      value: string;
      description: string | null;
      updatedAt: Date | null;
    }[]
  > {
    return await db
      .select({
        key: schema.prompts.key,
        value: schema.prompts.value,
        description: schema.prompts.description,
        updatedAt: schema.prompts.updatedAt,
      })
      .from(schema.prompts)
      .where(eq(schema.prompts.workspaceId, workspaceId))
      .orderBy(schema.prompts.key);
  },

  /** Workspace IDs that have non-empty value for the given key */
  async findWorkspaceIdsWithKey(key: string): Promise<string[]> {
    const rows = await db
      .select({ workspaceId: schema.prompts.workspaceId })
      .from(schema.prompts)
      .where(
        and(
          eq(schema.prompts.key, key),
          sql`${schema.prompts.value} IS NOT NULL AND trim(${schema.prompts.value}) != ''`,
        ),
      );
    return rows.map((r) => r.workspaceId);
  },

  async upsert(
    key: string,
    value: string,
    description: string | null,
    workspaceId: string,
  ): Promise<boolean> {
    const now = new Date();

    const existing = await db
      .select()
      .from(schema.prompts)
      .where(
        and(
          eq(schema.prompts.key, key),
          eq(schema.prompts.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      const result = await db
        .update(schema.prompts)
        .set({
          value,
          description: description ?? existing[0].description,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.prompts.key, key),
            eq(schema.prompts.workspaceId, workspaceId),
          ),
        );

      return (result.rowCount ?? 0) > 0;
    }

    await db.insert(schema.prompts).values({
      key,
      value,
      description: description ?? "",
      updatedAt: now,
      workspaceId: workspaceId,
    });
    return true;
  },
};

export type PromptsRepository = typeof promptsRepository;
