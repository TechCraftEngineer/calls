/**
 * Workspaces repository - handles database operations for workspaces and members
 */

import { and, desc, eq, gt, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";

export type WorkspaceMemberRole = "owner" | "admin" | "member";

export interface CreateWorkspaceData {
  name: string;
  metadata?: Record<string, unknown> | null;
}

export interface AddMemberData {
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
}

export interface AddPendingMemberData {
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
  invitationToken: string;
  invitationExpiresAt: Date;
  invitedBy: string;
}

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Transaction helper for atomic operations
 */
export async function withTransaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(callback);
}

export const workspacesRepository = {
  get table() {
    return schema.workspaces;
  },

  get workspaceMembersTable() {
    return schema.workspaceMembers;
  },

  async create(data: CreateWorkspaceData): Promise<string> {
    const result = await db
      .insert(schema.workspaces)
      .values({
        name: data.name,
        metadata: data.metadata ?? null,
      })
      .returning({ id: schema.workspaces.id });
    return result[0]?.id ?? "";
  },

  async getById(id: string): Promise<typeof schema.workspaces.$inferSelect | null> {
    const result = await db
      .select()
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, id))
      .limit(1);
    return result[0] ?? null;
  },

  async update(
    id: string,
    data: {
      name?: string;
      nameEn?: string | null;
      description?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<boolean> {
    const result = await db.update(schema.workspaces).set(data).where(eq(schema.workspaces.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(schema.workspaces).where(eq(schema.workspaces.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  async getMembers(workspaceId: string) {
    return db
      .select({
        id: schema.workspaceMembers.id,
        workspaceId: schema.workspaceMembers.workspaceId,
        userId: schema.workspaceMembers.userId,
        role: schema.workspaceMembers.role,
        status: schema.workspaceMembers.status,
        invitationToken: schema.workspaceMembers.invitationToken,
        invitationExpiresAt: schema.workspaceMembers.invitationExpiresAt,
        invitedBy: schema.workspaceMembers.invitedBy,
        createdAt: schema.workspaceMembers.createdAt,
        user: schema.user,
        evaluationSettings: schema.userWorkspaceSettings.evaluationSettings,
      })
      .from(schema.workspaceMembers)
      .innerJoin(schema.user, eq(schema.workspaceMembers.userId, schema.user.id))
      .leftJoin(
        schema.userWorkspaceSettings,
        and(
          eq(schema.workspaceMembers.userId, schema.userWorkspaceSettings.userId),
          eq(schema.workspaceMembers.workspaceId, schema.userWorkspaceSettings.workspaceId),
        ),
      )
      .where(eq(schema.workspaceMembers.workspaceId, workspaceId))
      .orderBy(desc(schema.workspaceMembers.createdAt));
  },

  async addMember(data: AddMemberData): Promise<string> {
    const result = await db
      .insert(schema.workspaceMembers)
      .values({
        workspaceId: data.workspaceId,
        userId: data.userId,
        role: data.role,
        status: "active",
      })
      .returning({ id: schema.workspaceMembers.id });
    return result[0]?.id ?? "";
  },

  async addPendingMember(data: {
    workspaceId: string;
    userId: string;
    role: WorkspaceMemberRole;
    invitationToken: string;
    invitationExpiresAt: Date;
    invitedBy: string;
  }): Promise<string> {
    const result = await db
      .insert(schema.workspaceMembers)
      .values({
        workspaceId: data.workspaceId,
        userId: data.userId,
        role: data.role,
        status: "pending",
        invitationToken: data.invitationToken,
        invitationExpiresAt: data.invitationExpiresAt,
        invitedBy: data.invitedBy,
      })
      .returning({ id: schema.workspaceMembers.id });
    return result[0]?.id ?? "";
  },

  async getPendingMembers(workspaceId: string) {
    return db
      .select({
        id: schema.workspaceMembers.id,
        workspaceId: schema.workspaceMembers.workspaceId,
        userId: schema.workspaceMembers.userId,
        role: schema.workspaceMembers.role,
        status: schema.workspaceMembers.status,
        invitationToken: schema.workspaceMembers.invitationToken,
        invitationExpiresAt: schema.workspaceMembers.invitationExpiresAt,
        invitedBy: schema.workspaceMembers.invitedBy,
        createdAt: schema.workspaceMembers.createdAt,
        user: schema.user,
      })
      .from(schema.workspaceMembers)
      .innerJoin(schema.user, eq(schema.workspaceMembers.userId, schema.user.id))
      .where(
        and(
          eq(schema.workspaceMembers.workspaceId, workspaceId),
          eq(schema.workspaceMembers.status, "pending"),
        ),
      )
      .orderBy(desc(schema.workspaceMembers.createdAt));
  },

  async getMemberByInvitationToken(token: string) {
    const result = await db
      .select()
      .from(schema.workspaceMembers)
      .where(eq(schema.workspaceMembers.invitationToken, token))
      .limit(1);
    return result[0] ?? null;
  },

  async getPendingMemberById(
    memberId: string,
    workspaceId: string,
  ): Promise<{
    id: string;
    userId: string;
    workspaceId: string;
    role: string;
    status: string;
  } | null> {
    const result = await db
      .select({
        id: schema.workspaceMembers.id,
        userId: schema.workspaceMembers.userId,
        workspaceId: schema.workspaceMembers.workspaceId,
        role: schema.workspaceMembers.role,
        status: schema.workspaceMembers.status,
      })
      .from(schema.workspaceMembers)
      .where(
        and(
          eq(schema.workspaceMembers.id, memberId),
          eq(schema.workspaceMembers.workspaceId, workspaceId),
          eq(schema.workspaceMembers.status, "pending"),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  },

  async activateMember(memberId: string): Promise<boolean> {
    const result = await db
      .update(schema.workspaceMembers)
      .set({
        status: "active",
        invitationToken: null,
        invitationExpiresAt: null,
      })
      .where(eq(schema.workspaceMembers.id, memberId));
    return (result.rowCount ?? 0) > 0;
  },

  async updateMemberInvitationToken(
    memberId: string,
    token: string,
    expiresAt: Date,
  ): Promise<boolean> {
    const result = await db
      .update(schema.workspaceMembers)
      .set({
        invitationToken: token,
        invitationExpiresAt: expiresAt,
      })
      .where(eq(schema.workspaceMembers.id, memberId));
    return (result.rowCount ?? 0) > 0;
  },

  async removeMember(workspaceId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(schema.workspaceMembers)
      .where(
        and(
          eq(schema.workspaceMembers.workspaceId, workspaceId),
          eq(schema.workspaceMembers.userId, userId),
        ),
      );
    return (result.rowCount ?? 0) > 0;
  },

  async removeMemberById(memberId: string, workspaceId: string): Promise<boolean> {
    const result = await db
      .delete(schema.workspaceMembers)
      .where(
        and(
          eq(schema.workspaceMembers.id, memberId),
          eq(schema.workspaceMembers.workspaceId, workspaceId),
          eq(schema.workspaceMembers.status, "pending"),
        ),
      );
    return (result.rowCount ?? 0) > 0;
  },

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceMemberRole,
  ): Promise<boolean> {
    const result = await db
      .update(schema.workspaceMembers)
      .set({ role })
      .where(
        and(
          eq(schema.workspaceMembers.workspaceId, workspaceId),
          eq(schema.workspaceMembers.userId, userId),
        ),
      );
    return (result.rowCount ?? 0) > 0;
  },

  async getMember(
    workspaceId: string,
    userId: string,
  ): Promise<(typeof schema.workspaceMembers.$inferSelect & { status: string }) | null> {
    const result = await db
      .select()
      .from(schema.workspaceMembers)
      .where(
        and(
          eq(schema.workspaceMembers.workspaceId, workspaceId),
          eq(schema.workspaceMembers.userId, userId),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  },

  async getUserWorkspaces(userId: string) {
    return db
      .select({
        workspace: schema.workspaces,
        role: schema.workspaceMembers.role,
        createdAt: schema.workspaceMembers.createdAt,
      })
      .from(schema.workspaceMembers)
      .innerJoin(schema.workspaces, eq(schema.workspaceMembers.workspaceId, schema.workspaces.id))
      .where(
        and(
          eq(schema.workspaceMembers.userId, userId),
          eq(schema.workspaceMembers.status, "active"),
        ),
      )
      .orderBy(desc(schema.workspaceMembers.createdAt));
  },

  async getPendingInvitationsForUser(userId: string) {
    const now = new Date();
    return db
      .select({
        token: schema.workspaceMembers.invitationToken,
        workspaceId: schema.workspaceMembers.workspaceId,
      })
      .from(schema.workspaceMembers)
      .where(
        and(
          eq(schema.workspaceMembers.userId, userId),
          eq(schema.workspaceMembers.status, "pending"),
          isNotNull(schema.workspaceMembers.invitationToken),
          isNotNull(schema.workspaceMembers.invitationExpiresAt),
          gt(schema.workspaceMembers.invitationExpiresAt, now),
        ),
      );
  },

  async getByIds(workspaceIds: string[]) {
    if (workspaceIds.length === 0) return [];

    return db
      .select({
        id: schema.workspaces.id,
        name: schema.workspaces.name,
      })
      .from(schema.workspaces)
      .where(inArray(schema.workspaces.id, workspaceIds));
  },

  async getUsersNotInWorkspace(workspaceId: string) {
    return db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        username: schema.user.username,
      })
      .from(schema.user)
      .leftJoin(
        schema.workspaceMembers,
        and(
          eq(schema.workspaceMembers.userId, schema.user.id),
          eq(schema.workspaceMembers.workspaceId, workspaceId),
        ),
      )
      .where(isNull(schema.workspaceMembers.userId))
      .orderBy(schema.user.name);
  },

  async getActiveWorkspaceId(userId: string): Promise<string | null> {
    const result = await db
      .select({ activeWorkspaceId: schema.userPreferences.activeWorkspaceId })
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.userId, userId))
      .limit(1);
    return result[0]?.activeWorkspaceId ?? null;
  },

  async setActiveWorkspace(userId: string, workspaceId: string): Promise<void> {
    await db
      .insert(schema.userPreferences)
      .values({ userId, activeWorkspaceId: workspaceId })
      .onConflictDoUpdate({
        target: schema.userPreferences.userId,
        set: {
          activeWorkspaceId: workspaceId,
          updatedAt: new Date(),
        },
      });
  },

  async completeOnboarding(workspaceId: string): Promise<boolean> {
    const result = await db
      .update(schema.workspaces)
      .set({
        isOnboarded: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.workspaces.id, workspaceId));
    return (result.rowCount ?? 0) > 0;
  },

  async getSetupProgress(workspaceId: string): Promise<string[]> {
    const workspace = await this.getById(workspaceId);
    if (!workspace?.metadata) return [];
    const metadata = workspace.metadata as Record<string, unknown>;
    return Array.isArray(metadata.setupCompletedSteps) ? metadata.setupCompletedSteps : [];
  },

  async updateSetupProgress(workspaceId: string, completedSteps: string[]): Promise<boolean> {
    return db.transaction(async (tx) => {
      // Блокируем строку для чтения и обновления
      const workspace = await tx
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, workspaceId))
        .for("update")
        .limit(1);

      if (!workspace[0]) return false;

      const existingMetadata = (workspace[0].metadata as Record<string, unknown>) ?? {};

      const metadata = { ...existingMetadata };
      metadata.setupCompletedSteps = completedSteps;

      const result = await tx
        .update(schema.workspaces)
        .set({
          metadata,
          updatedAt: new Date(),
        })
        .where(eq(schema.workspaces.id, workspaceId));

      return (result.rowCount ?? 0) > 0;
    });
  },

  async addSetupStep(workspaceId: string, step: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      // Блокируем строку для чтения и обновления
      const workspace = await tx
        .select()
        .from(schema.workspaces)
        .where(eq(schema.workspaces.id, workspaceId))
        .for("update")
        .limit(1);

      if (!workspace[0]) return false;

      const existingMetadata = (workspace[0].metadata as Record<string, unknown>) ?? {};
      const metadata = { ...existingMetadata };

      const currentSteps = Array.isArray(metadata.setupCompletedSteps)
        ? metadata.setupCompletedSteps
        : [];

      // Добавляем шаг только если его еще нет
      if (!currentSteps.includes(step)) {
        metadata.setupCompletedSteps = [...currentSteps, step];
      } else {
        metadata.setupCompletedSteps = currentSteps;
      }

      const result = await tx
        .update(schema.workspaces)
        .set({
          metadata,
          updatedAt: new Date(),
        })
        .where(eq(schema.workspaces.id, workspaceId));

      return (result.rowCount ?? 0) > 0;
    });
  },
};

export type WorkspacesRepository = typeof workspacesRepository;
