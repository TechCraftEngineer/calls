/**
 * Basic CRUD operations for calls
 */

import { eq, and } from "drizzle-orm";
import { db } from "../../client";
import * as schema from "../../schema";
import type { CreateCallData } from "../../types/calls.types";
import { normalizeCallStatus } from "../../utils/call-status";
import { buildCallConditions } from "./build-conditions";

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
      .orderBy(schema.calls.timestamp)
      .limit(1);
    const row = result[0];
    return row ?? null;
  },

  async createWithResult(
    data: CreateCallData,
  ): Promise<{ id: string; created: boolean }> {
    const status = normalizeCallStatus(data.status) ?? null;
    const values = {
      workspaceId: data.workspaceId,
      filename: data.filename,
      provider: data.provider ?? null,
      externalId: data.externalId ?? null,
      number: data.number ?? null,
      timestamp: new Date(data.timestamp),
      name: data.name ?? null,
      direction: data.direction ?? null,
      status,
      fileId: data.fileId ?? null,
      pbxNumberId: data.pbxNumberId ?? null,
      internalNumber: data.internalNumber ?? null,
      source: data.source ?? null,
      customerName: data.customerName ?? null,
    };

    const result =
      data.provider && data.externalId
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
      const existing = await this.findByExternalId(
        data.workspaceId,
        data.provider!,
        data.externalId!,
      );
      return existing ? { id: existing.id, created: false } : { id: "", created: false };
    }

    return { id: result[0]!.id, created: true };
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
      pbxNumberId?: string | null;
      internalNumber?: string | null;
      source?: string | null;
      name?: string | null;
    },
  ): Promise<void> {
    const patch: Partial<schema.NewCall> = {};
    if (data.pbxNumberId !== undefined) patch.pbxNumberId = data.pbxNumberId;
    if (data.internalNumber !== undefined) patch.internalNumber = data.internalNumber;
    if (data.source !== undefined) patch.source = data.source;
    if (data.name !== undefined) patch.name = data.name;
    
    await db.update(schema.calls).set(patch).where(eq(schema.calls.id, callId));
  },
};
