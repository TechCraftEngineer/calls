/**
 * Workspaces service - business logic for workspace operations
 */

import { db } from "../client";
import { workspaceCache } from "../lib/workspace-cache";
import type {
  AddMemberData,
  CreateWorkspaceData,
  WorkspaceMemberRole,
  WorkspacesRepository,
} from "../repositories/workspaces.repository";

// Re-export for convenience
export type { CreateWorkspaceData, WorkspaceMemberRole };

export class WorkspacesService {
  constructor(private workspacesRepository: WorkspacesRepository) {}

  async create(
    data: CreateWorkspaceData,
    ownerUserId: string,
  ): Promise<string> {
    // Используем транзакцию для атомарного создания workspace и владельца
    return await db.transaction(async (tx) => {
      // Создаем workspace
      const workspaceResult = await tx
        .insert(this.workspacesRepository.table)
        .values({
          name: data.name,
          slug: data.slug,
          metadata: data.metadata ?? null,
        })
        .returning({ id: this.workspacesRepository.table.id });

      const workspaceId = workspaceResult[0]?.id;
      if (!workspaceId) {
        throw new Error("Failed to create workspace");
      }

      // Добавляем владельца
      await tx.insert(this.workspacesRepository.workspaceMembersTable).values({
        workspaceId: workspaceId,
        userId: ownerUserId,
        role: "owner",
      });

      return workspaceId;
    });
  }

  async getById(id: string) {
    return this.workspacesRepository.getById(id);
  }

  async getBySlug(slug: string) {
    const cacheKey = workspaceCache.createBySlugKey(slug);
    const cached =
      workspaceCache.get<
        Awaited<ReturnType<typeof this.workspacesRepository.getBySlug>>
      >(cacheKey);
    if (cached) return cached;

    const result = await this.workspacesRepository.getBySlug(slug);
    if (result) {
      workspaceCache.set(cacheKey, result);
    }
    return result;
  }

  async update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    // Get current workspace to check if slug is changing
    const currentWs = await this.workspacesRepository.getById(id);
    const oldSlug = currentWs?.slug;

    const result = await this.workspacesRepository.update(id, data);

    // Invalidate cache for this workspace
    workspaceCache.invalidateWorkspace(id);

    // If slug changed, invalidate old slug cache
    if (oldSlug && data.slug && oldSlug !== data.slug) {
      const oldSlugKey = workspaceCache.createBySlugKey(oldSlug);
      workspaceCache.delete(oldSlugKey);
    }

    return result;
  }

  async delete(id: string) {
    const result = await this.workspacesRepository.delete(id);
    // Invalidate cache for this workspace
    workspaceCache.invalidateWorkspace(id);
    return result;
  }

  async getMembers(workspaceId: string) {
    return this.workspacesRepository.getMembers(workspaceId);
  }

  async addMember(data: AddMemberData) {
    const result = await this.workspacesRepository.addMember(data);
    // Invalidate user workspaces cache when member is added
    workspaceCache.invalidateUserWorkspaces(data.userId);
    return result;
  }

  async removeMember(workspaceId: string, userId: string) {
    const result = await this.workspacesRepository.removeMember(workspaceId, userId);
    // Invalidate user workspaces cache when member is removed
    workspaceCache.invalidateUserWorkspaces(userId);
    return result;
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceMemberRole,
  ) {
    return this.workspacesRepository.updateMemberRole(
      workspaceId,
      userId,
      role,
    );
  }

  async getUserWorkspaces(userId: string) {
    const cacheKey = workspaceCache.createUserWorkspacesKey(userId);
    const cached = workspaceCache.get<
      Awaited<ReturnType<typeof this.workspacesRepository.getUserWorkspaces>>
    >(cacheKey);
    if (cached) return cached;

    const result = await this.workspacesRepository.getUserWorkspaces(userId);
    workspaceCache.set(cacheKey, result);
    return result;
  }

  async getMemberWithRole(
    workspaceId: string,
    userId: string,
  ): Promise<{ role: WorkspaceMemberRole } | null> {
    const member = await this.workspacesRepository.getMember(
      workspaceId,
      userId,
    );
    return member ? { role: member.role as WorkspaceMemberRole } : null;
  }

  async ensureUserInWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberRole | null> {
    const member = await this.workspacesRepository.getMember(
      workspaceId,
      userId,
    );
    return (member?.role as WorkspaceMemberRole) ?? null;
  }

  async getActiveWorkspaceId(userId: string): Promise<string | null> {
    const cacheKey = workspaceCache.createActiveWorkspaceKey(userId);
    const cached = workspaceCache.get<string>(cacheKey);
    if (cached !== undefined) return cached;

    const result = await this.workspacesRepository.getActiveWorkspaceId(userId);
    workspaceCache.set(cacheKey, result);
    return result;
  }

  async setActiveWorkspace(userId: string, workspaceId: string): Promise<void> {
    // Validate workspace exists and user has access
    const memberRole = await this.ensureUserInWorkspace(workspaceId, userId);
    if (!memberRole) {
      throw new Error("User does not have access to this workspace");
    }

    await this.workspacesRepository.setActiveWorkspace(userId, workspaceId);
    // Update cache
    const cacheKey = workspaceCache.createActiveWorkspaceKey(userId);
    workspaceCache.set(cacheKey, workspaceId);
    // Invalidate user workspaces cache since active workspace changed
    workspaceCache.invalidateUserWorkspaces(userId);
  }
}
