/**
 * Basic CRUD operations for calls
 */

import { eq, and, desc } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";
import type { CreateCallData } from "../../types/calls.types";
import { normalizeCallStatus } from "../../utils/call-status";

export const callsCrud = {
  async findById(id: string): Promise<schema.Call | null> {
    const result = await db
      .select()
      .from(schema.calls)
      .where(eq(schema.calls.id, id))
      .limit(1);
    return result[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(schema.calls).where(eq(schema.calls.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  async findByFilename(
    filename: string,
    workspaceId?: string,
  ): Promise<schema.Call | null> {
    const conditions = [eq(schema.calls.filename, filename)];
    if (workspaceId != null) {
      conditions.push(eq(schema.calls.workspaceId, workspaceId));
    }
    const result = await db
      .select()
      .from(schema.calls)
      .where(and(...conditions))
      .limit(1);
    return result[0] ?? null;
  },

  async findByExternalId(
    workspaceId: string,
    provider: string,
    externalId: string,
  ): Promise<schema.Call | null> {
    const result = await db
      .select()
      .from(schema.calls)
      .where(
        and(
          eq(schema.calls.workspaceId, workspaceId),
          eq(schema.calls.provider, provider),
          eq(schema.calls.externalId, externalId),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  },

  async findLatestByPhone(
    workspaceId: string,
    phone: string,
  ): Promise<{
    id: string;
    timestamp: Date;
    customerName: string | null;
    internalNumber: string | null;
    name: string | null;
  } | null> {
    const result = await db
      .select({
        id: schema.calls.id,
        timestamp: schema.calls.timestamp,
        customerName: schema.calls.customerName,
        internalNumber: schema.calls.internalNumber,
        name: schema.calls.name,
      })
      .from(schema.calls)
      .where(
        and(
          eq(schema.calls.workspaceId, workspaceId),
          eq(schema.calls.number, phone),
        ),
      )
      .orderBy(desc(schema.calls.timestamp))
      .limit(1);
    const row = result[0];
    return row ?? null;
  },

  async createWithResult(
    data: CreateCallData,
  ): Promise<{ id: string; created: boolean }> {
    const status = normalizeCallStatus(data.status) ?? null;
    // Нормализуем provider и externalId для консистентной обработки
    const normalizedProvider = typeof data.provider === 'string' ? data.provider.trim() || null : data.provider || null;
    const normalizedExternalId = typeof data.externalId === 'string' ? data.externalId.trim() || null : data.externalId || null;

    const values = {
      workspaceId: data.workspaceId,
      filename: data.filename,
      provider: normalizedProvider,
      externalId: normalizedExternalId,
      number: data.number ?? null,
      timestamp: new Date(data.timestamp),
      name: data.name ?? null,
      direction: data.direction ?? null,
      status,
      fileId: data.fileId ?? null,
      internalNumber: data.internalNumber ?? null,
      source: data.source ?? null,
      customerName: data.customerName ?? null,
    };

    const result =
      normalizedProvider && normalizedExternalId
        ? await db
            .insert(schema.calls)
            .values(values)
            .onConflictDoNothing({
              target: [
                schema.calls.workspaceId,
                schema.calls.provider,
                schema.calls.externalId,
              ],
            })
            .returning({ id: schema.calls.id })
        : await db.insert(schema.calls).values(values).returning({ id: schema.calls.id });

    if (result.length === 0) {
      // Find existing record
      if (!normalizedProvider || !normalizedExternalId) {
        throw new Error(`Ошибка вставки: отсутствуют provider или externalId для поиска существующей записи`);
      }
      const existing = await this.findByExternalId(
        data.workspaceId,
        normalizedProvider,
        normalizedExternalId,
      );
      if (!existing) {
        throw new Error(`Ошибка вставки: запись не найдена для workspaceId=${data.workspaceId}, provider=${normalizedProvider}, externalId=${normalizedExternalId}`);
      }
      return { id: existing.id, created: false };
    }

    if (!result[0]?.id) {
      throw new Error('Ошибка вставки: не получен ID от базы данных');
    }
    return { id: result[0].id, created: true };
  },

  async create(data: CreateCallData): Promise<string> {
    const created = await this.createWithResult(data);
    return created.id;
  },

  async updateCustomerName(
    callId: string,
    customerName: string | null,
  ): Promise<void> {
    await db
      .update(schema.calls)
      .set({ customerName })
      .where(eq(schema.calls.id, callId));
  },

  async updateRecording(
    callId: string,
    data: { fileId: string | null },
  ): Promise<void> {
    await db
      .update(schema.calls)
      .set({ fileId: data.fileId })
      .where(eq(schema.calls.id, callId));
  },

  async updateEnhancedAudio(
    callId: string,
    enhancedAudioFileId: string | null,
  ): Promise<void> {
    await db
      .update(schema.calls)
      .set({ enhancedAudioFileId })
      .where(eq(schema.calls.id, callId));
  },

  async updatePbxBinding(
    callId: string,
    data: {
      internalNumber?: string | null;
      source?: string | null;
      name?: string | null;
    },
  ): Promise<void> {
    const patch: Partial<schema.NewCall> = {};
    if (data.internalNumber !== undefined) patch.internalNumber = data.internalNumber;
    if (data.source !== undefined) patch.source = data.source;
    if (data.name !== undefined) patch.name = data.name;
    
    await db.update(schema.calls).set(patch).where(eq(schema.calls.id, callId));
  },
};
