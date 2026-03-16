/**
 * Invitations repository - database operations for workspace invitations
 */

import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";

const INVITATION_EXPIRY_DAYS = 7;

export function generateInviteToken(): string {
  // Используем криптографически безопасный генератор
  // 32 байта = 64 hex символа - достаточно для безопасности
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function getDefaultExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + INVITATION_EXPIRY_DAYS);
  return d;
}

export const invitationsRepository = {
  async create(data: {
    workspaceId: string;
    email: string;
    role: "owner" | "admin" | "member";
    token: string;
    invitedBy: string;
    expiresAt: Date;
  }) {
    const result = await db
      .insert(schema.invitations)
      .values({
        workspaceId: data.workspaceId,
        email: data.email.toLowerCase().trim(),
        role: data.role,
        token: data.token,
        invitedBy: data.invitedBy,
        expiresAt: data.expiresAt,
      })
      .returning({ id: schema.invitations.id });
    return result[0]?.id ?? null;
  },

  async findByToken(token: string) {
    const result = await db
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.token, token))
      .limit(1);
    return result[0] ?? null;
  },

  async findValidByToken(token: string) {
    const now = new Date();
    const result = await db
      .select()
      .from(schema.invitations)
      .where(
        and(
          eq(schema.invitations.token, token),
          gt(schema.invitations.expiresAt, now),
          isNull(schema.invitations.acceptedAt),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  },

  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(schema.invitations)
      .where(
        and(
          eq(schema.invitations.workspaceId, workspaceId),
          isNull(schema.invitations.acceptedAt),
        ),
      )
      .orderBy(desc(schema.invitations.createdAt));
  },

  async markAccepted(invitationId: string, acceptedBy: string) {
    const result = await db
      .update(schema.invitations)
      .set({
        acceptedAt: new Date(),
        acceptedBy,
      })
      .where(eq(schema.invitations.id, invitationId));
    return (result.rowCount ?? 0) > 0;
  },

  async revoke(invitationId: string) {
    const result = await db
      .delete(schema.invitations)
      .where(eq(schema.invitations.id, invitationId));
    return (result.rowCount ?? 0) > 0;
  },

  async updatePendingSettings(
    invitationId: string,
    settings: Record<string, unknown>,
  ) {
    const result = await db
      .update(schema.invitations)
      .set({ pendingSettings: settings as never })
      .where(eq(schema.invitations.id, invitationId));
    return (result.rowCount ?? 0) > 0;
  },

  async findByIdAndWorkspace(invitationId: string, workspaceId: string) {
    const result = await db
      .select()
      .from(schema.invitations)
      .where(
        and(
          eq(schema.invitations.id, invitationId),
          eq(schema.invitations.workspaceId, workspaceId),
          isNull(schema.invitations.acceptedAt),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  },

  async hasPendingForEmail(
    workspaceId: string,
    email: string,
  ): Promise<boolean> {
    const result = await db
      .select({ id: schema.invitations.id })
      .from(schema.invitations)
      .where(
        and(
          eq(schema.invitations.workspaceId, workspaceId),
          eq(schema.invitations.email, email.toLowerCase().trim()),
          isNull(schema.invitations.acceptedAt),
          gt(schema.invitations.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return result.length > 0;
  },

  async revokeByIdAndWorkspace(
    invitationId: string,
    workspaceId: string,
  ): Promise<boolean> {
    const result = await db
      .delete(schema.invitations)
      .where(
        and(
          eq(schema.invitations.id, invitationId),
          eq(schema.invitations.workspaceId, workspaceId),
        ),
      );
    return (result.rowCount ?? 0) > 0;
  },
};

export type InvitationsRepository = typeof invitationsRepository;
