/**
 * Files repository - handles database operations for files
 */

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../client";
import { files } from "../schema";
import type { CreateFileData, GetFilesParams } from "../types";

export class FilesRepository {
  async create(data: CreateFileData) {
    const db = getDb();
    const result = await db
      .insert(files)
      .values({
        ...data,
        isPublic: data.isPublic ?? false,
      })
      .returning();
    return result[0];
  }

  async findById(id: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(files)
      .where(eq(files.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findByS3Key(s3Key: string) {
    const db = getDb();
    const result = await db
      .select()
      .from(files)
      .where(eq(files.s3Key, s3Key))
      .limit(1);
    return result[0] || null;
  }

  async findByWorkspaceId(params: GetFilesParams) {
    const db = getDb();
    const conditions = [];

    if (params.workspaceId) {
      conditions.push(eq(files.workspaceId, params.workspaceId));
    }
    if (params.fileType) {
      conditions.push(eq(files.fileType, params.fileType));
    }
    if (params.isPublic !== undefined) {
      conditions.push(eq(files.isPublic, params.isPublic));
    }

    let query = db
      .select()
      .from(files)
      .where(and(...conditions))
      .orderBy(desc(files.createdAt));

    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.offset(params.offset);
    }

    return await query;
  }

  async update(id: string, data: Partial<CreateFileData>) {
    const db = getDb();
    const result = await db
      .update(files)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();
    return result[0] || null;
  }

  async delete(id: string) {
    const db = getDb();
    const result = await db.delete(files).where(eq(files.id, id)).returning();
    return result[0] || null;
  }

  async deleteByS3Key(s3Key: string) {
    const db = getDb();
    const result = await db
      .delete(files)
      .where(eq(files.s3Key, s3Key))
      .returning();
    return result[0] || null;
  }
}
