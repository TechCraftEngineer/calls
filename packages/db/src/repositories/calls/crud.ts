/**
 * Basic CRUD operations for calls
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";
import type { CreateCallData } from "../../types/calls.types";
import { normalizeCallStatus } from "../../utils/call-status";
import {
  createCallSchema,
  updateCustomerNameSchema,
  updateEnhancedAudioSchema,
  updatePbxBindingSchema,
  updatePbxBindingWithCustomerSchema,
  updateRecordingSchema,
  updateWithRecordingSchema,
  validateCallId,
  validateWithSchema,
} from "../../validation/call-schemas";

export const callsCrud = {
  async findById(id: string): Promise<schema.Call | null> {
    const result = await db.select().from(schema.calls).where(eq(schema.calls.id, id)).limit(1);
    return result[0] ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(schema.calls).where(eq(schema.calls.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  async findByFilename(filename: string, workspaceId?: string): Promise<schema.Call | null> {
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
      .where(and(eq(schema.calls.workspaceId, workspaceId), eq(schema.calls.number, phone)))
      .orderBy(desc(schema.calls.timestamp))
      .limit(1);
    const row = result[0];
    return row ?? null;
  },

  async createWithResult(data: CreateCallData): Promise<{ id: string; created: boolean }> {
    // Валидация входных данных с помощью Zod
    const validatedData = validateWithSchema(createCallSchema, data);

    const status = normalizeCallStatus(validatedData.status) ?? null;
    // Нормализуем provider и externalId для консистентной обработки
    const normalizedProvider =
      typeof validatedData.provider === "string"
        ? validatedData.provider.trim() || null
        : validatedData.provider || null;
    const normalizedExternalId =
      typeof validatedData.externalId === "string"
        ? validatedData.externalId.trim() || null
        : validatedData.externalId || null;

    const values = {
      workspaceId: validatedData.workspaceId,
      filename: validatedData.filename,
      provider: normalizedProvider,
      externalId: normalizedExternalId,
      number: validatedData.number ?? null,
      timestamp: new Date(validatedData.timestamp),
      name: validatedData.name ?? null,
      direction: validatedData.direction ?? null,
      status,
      fileId: validatedData.fileId ?? null,
      internalNumber: validatedData.internalNumber ?? null,
      source: validatedData.source ?? null,
      customerName: validatedData.customerName ?? null,
    };

    const result =
      normalizedProvider && normalizedExternalId
        ? await db
            .insert(schema.calls)
            .values(values)
            .onConflictDoNothing({
              target: [schema.calls.workspaceId, schema.calls.provider, schema.calls.externalId],
            })
            .returning({ id: schema.calls.id })
        : await db.insert(schema.calls).values(values).returning({ id: schema.calls.id });

    if (result.length === 0) {
      // Find existing record
      if (!normalizedProvider || !normalizedExternalId) {
        throw new Error(
          `Ошибка вставки: отсутствуют provider или externalId для поиска существующей записи`,
        );
      }
      const existing = await this.findByExternalId(
        data.workspaceId,
        normalizedProvider,
        normalizedExternalId,
      );
      if (!existing) {
        throw new Error(
          `Ошибка вставки: запись не найдена для workspaceId=${data.workspaceId}, provider=${normalizedProvider}, externalId=${normalizedExternalId}`,
        );
      }
      return { id: existing.id, created: false };
    }

    if (!result[0]?.id) {
      throw new Error("Ошибка вставки: не получен ID от базы данных");
    }
    return { id: result[0].id, created: true };
  },

  async create(data: CreateCallData): Promise<string> {
    const created = await this.createWithResult(data);
    return created.id;
  },

  async updateCustomerName(callId: string, customerName: string | null): Promise<void> {
    // Валидация callId как UUID
    validateCallId(callId);

    // Валидация customerName с помощью Zod
    const validatedData = validateWithSchema(updateCustomerNameSchema, { customerName });

    await db
      .update(schema.calls)
      .set({ customerName: validatedData.customerName })
      .where(eq(schema.calls.id, callId));
  },

  async updateRecording(callId: string, data: { fileId: string | null }): Promise<void> {
    // Валидация callId как UUID
    validateCallId(callId);

    // Валидация данных с помощью Zod
    const validatedData = validateWithSchema(updateRecordingSchema, data);

    await db
      .update(schema.calls)
      .set({ fileId: validatedData.fileId })
      .where(eq(schema.calls.id, callId));
  },

  async updateEnhancedAudio(callId: string, enhancedAudioFileId: string | null): Promise<void> {
    // Валидация callId как UUID
    validateCallId(callId);

    // Валидация данных с помощью Zod
    const validatedData = validateWithSchema(updateEnhancedAudioSchema, { enhancedAudioFileId });

    await db
      .update(schema.calls)
      .set({ enhancedAudioFileId: validatedData.enhancedAudioFileId })
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
    // Валидация callId как UUID
    validateCallId(callId);

    // Валидация данных с помощью Zod
    const validatedData = validateWithSchema(updatePbxBindingSchema, data);

    const patch: Partial<schema.NewCall> = {};
    if (validatedData.internalNumber !== undefined)
      patch.internalNumber = validatedData.internalNumber;
    if (validatedData.source !== undefined) patch.source = validatedData.source;
    if (validatedData.name !== undefined) patch.name = validatedData.name;

    await db.update(schema.calls).set(patch).where(eq(schema.calls.id, callId));
  },

  /**
   * Транзакционное обновление записи звонка и файла
   */
  async updateWithRecording(
    callId: string,
    data: {
      fileId: string | null;
      enhancedAudioFileId?: string | null;
      customerName?: string | null;
    },
  ): Promise<void> {
    // Валидация callId как UUID
    validateCallId(callId);

    // Валидация данных с помощью Zod
    const validatedData = validateWithSchema(updateWithRecordingSchema, data);

    await db.transaction(async (tx) => {
      const updateData: Partial<schema.NewCall> = {
        fileId: validatedData.fileId,
      };

      if (validatedData.enhancedAudioFileId !== undefined) {
        updateData.enhancedAudioFileId = validatedData.enhancedAudioFileId;
      }

      if (validatedData.customerName !== undefined) {
        updateData.customerName = validatedData.customerName;
      }

      await tx.update(schema.calls).set(updateData).where(eq(schema.calls.id, callId));
    });
  },

  /**
   * Транзакционное обновление PBX привязки и имени клиента
   */
  async updatePbxBindingWithCustomer(
    callId: string,
    data: {
      internalNumber?: string | null;
      source?: string | null;
      name?: string | null;
      customerName?: string | null;
    }
  ) {
    // Валидация callId как UUID
    validateCallId(callId);

    // Валидация данных с помощью Zod
    const validatedData = validateWithSchema(updatePbxBindingWithCustomerSchema, data);

    return await db.transaction(async (tx) => {
      const patch: Partial<schema.NewCall> = {};

      if (validatedData.internalNumber !== undefined) {
        patch.internalNumber = validatedData.internalNumber;
      }

      if (validatedData.source !== undefined) {
        patch.source = validatedData.source;
      }

      if (validatedData.name !== undefined) {
        patch.name = validatedData.name;
      }

      if (validatedData.customerName !== undefined) {
        patch.customerName = validatedData.customerName;
      }

      await tx.update(schema.calls).set(patch).where(eq(schema.calls.id, callId));
    });
  },
};
