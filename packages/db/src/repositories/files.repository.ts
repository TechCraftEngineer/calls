/**
 * Files repository - handles database operations for files
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "../client";
import { files } from "../schema";
import type { CreateFileData, GetFilesParams } from "../types";

export const filesRepository = {
  async create(data: CreateFileData) {
    const result = await db.insert(files).values(data).returning();
    return result[0];
  },

  async findById(id: string) {
    const result = await db
      .select()
      .from(files)
      .where(eq(files.id, id))
      .limit(1);
    return result[0] || null;
  },

  async findByStorageKey(storageKey: string) {
    const result = await db
      .select()
      .from(files)
      .where(eq(files.storageKey, storageKey))
      .limit(1);
    return result[0] || null;
  },

  async findByWorkspaceId(params: GetFilesParams) {
    const conditions = [];

    if (params.workspaceId) {
      conditions.push(eq(files.workspaceId, params.workspaceId));
    }
    if (params.fileType) {
      conditions.push(eq(files.fileType, params.fileType));
    }

    return db
      .select()
      .from(files)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(files.createdAt))
      .limit(params.limit ?? 1000)
      .offset(params.offset ?? 0);
  },

  async update(id: string, data: Partial<CreateFileData>) {
    const result = await db
      .update(files)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();
    return result[0] || null;
  },

  async delete(id: string) {
    const result = await db.delete(files).where(eq(files.id, id)).returning();
    return result[0] || null;
  },

  async deleteByStorageKey(storageKey: string) {
    const result = await db
      .delete(files)
      .where(eq(files.storageKey, storageKey))
      .returning();
    return result[0] || null;
  },
};

export type FilesRepository = typeof filesRepository;
