/**
 * Prompts repository - handles all database operations for prompts
 */

import { eq } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";
import { BaseRepository } from "./base.repository";

export class PromptsRepository extends BaseRepository<typeof schema.prompts> {
  constructor() {
    super(schema.prompts);
  }

  async findByKey(key: string): Promise<string | null> {
    const result = await db
      .select()
      .from(schema.prompts)
      .where(eq(schema.prompts.key, key))
      .limit(1);

    return result[0]?.value ?? null;
  }

  async findByKeyWithDefault(
    key: string,
    defaultValue?: string,
  ): Promise<string | null> {
    const result = await db
      .select()
      .from(schema.prompts)
      .where(eq(schema.prompts.key, key))
      .limit(1);

    return result[0]?.value ?? defaultValue ?? null;
  }

  async findAll(): Promise<
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
      .orderBy(schema.prompts.key);
  }

  async upsert(
    key: string,
    value: string,
    description?: string | null,
    workspaceId?: number,
  ): Promise<boolean> {
    const now = new Date();

    const existing = await db
      .select()
      .from(schema.prompts)
      .where(eq(schema.prompts.key, key))
      .limit(1);

    if (existing[0]) {
      const result = await db
        .update(schema.prompts)
        .set({
          value,
          description: description ?? existing[0].description,
          updatedAt: now,
        })
        .where(eq(schema.prompts.key, key));

      return (result.rowCount ?? 0) > 0;
    }

    await db.insert(schema.prompts).values({
      key,
      value,
      description: description ?? "",
      updatedAt: now,
      workspaceId: workspaceId ?? 1, // Default workspace if not provided
    });
    return true;
  }
}
