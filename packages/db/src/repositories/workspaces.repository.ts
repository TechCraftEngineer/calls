/**
 * Workspaces repository - handles database operations for workspaces and members
 */

import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";

export type WorkspaceMemberRole = "owner" | "admin" | "member";

export interface CreateWorkspaceData {
  name: string;
  slug: string;
  metadata?: Record<string, unknown> | null;
}

export interface AddMemberData {
  workspaceId: string;
  userId: string;
  role: WorkspaceMemberRole;
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
        slug: data.slug,
        metadata: data.metadata ?? null,
      })
      .returning({ id: schema.workspaces.id });
    return result[0]?.id ?? "";
  },

  async getById(
    id: string,
  ): Promise<typeof schema.workspaces.$inferSelect | null> {
    const result = await db
      .select()
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, id))
      .limit(1);
    return result[0] ?? null;
  },

  async getBySlug(
    slug: string,
  ): Promise<typeof schema.workspaces.$inferSelect | null> {
    const result = await db
      .select()
      .from(schema.workspaces)
      .where(eq(schema.workspaces.slug, slug))
      .limit(1);
    return result[0] ?? null;
  },

  async update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<boolean> {
    const result = await db
      .update(schema.workspaces)
      .set(data)
      .where(eq(schema.workspaces.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(schema.workspaces)
      .where(eq(schema.workspaces.id, id));
    return (result.rowCount ?? 0) > 0;
  },

  async getMembers(workspaceId: string) {
    return db
      .select({
        id: schema.workspaceMembers.id,
        workspaceId: schema.workspaceMembers.workspaceId,
        userId: schema.workspaceMembers.userId,
        role: schema.workspaceMembers.role,
        createdAt: schema.workspaceMembers.createdAt,
        user: schema.user,
        evaluationSettings: schema.userWorkspaceSettings.evaluationSettings,
      })
      .from(schema.workspaceMembers)
      .innerJoin(
        schema.user,
        eq(schema.workspaceMembers.userId, schema.user.id),
      )
      .leftJoin(
        schema.userWorkspaceSettings,
        and(
          eq(
            schema.workspaceMembers.userId,
            schema.userWorkspaceSettings.userId,
          ),
          eq(
            schema.workspaceMembers.workspaceId,
            schema.userWorkspaceSettings.workspaceId,
          ),
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
      })
      .returning({ id: schema.workspaceMembers.id });
    return result[0]?.id ?? "";
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
  ): Promise<typeof schema.workspaceMembers.$inferSelect | null> {
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
      .innerJoin(
        schema.workspaces,
        eq(schema.workspaceMembers.workspaceId, schema.workspaces.id),
      )
      .where(eq(schema.workspaceMembers.userId, userId))
      .orderBy(desc(schema.workspaceMembers.createdAt));
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
};

export type WorkspacesRepository = typeof workspacesRepository;
