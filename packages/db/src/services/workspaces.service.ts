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

  async create(data: CreateWorkspaceData, ownerUserId: string): Promise<string> {
    // Используем транзакцию для атомарного создания workspace и владельца
    const workspaceId = await db.transaction(async (tx) => {
      // Создаем workspace
      const workspaceResult = await tx
        .insert(this.workspacesRepository.table)
        .values({
          name: data.name,
          metadata: data.metadata ?? null,
        })
        .returning({ id: this.workspacesRepository.table.id });

      const id = workspaceResult[0]?.id;
      if (!id) {
        throw new Error("Failed to create workspace");
      }

      // Добавляем владельца
      await tx.insert(this.workspacesRepository.workspaceMembersTable).values({
        workspaceId: id,
        userId: ownerUserId,
        role: "owner",
      });

      return id;
    });

    // Сразу делаем новый workspace активным для создателя
    await this.setActiveWorkspace(ownerUserId, workspaceId);

    return workspaceId;
  }

  async getById(id: string) {
    return this.workspacesRepository.getById(id);
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    const result = await this.workspacesRepository.update(id, data);

    // Invalidate cache for this workspace
    workspaceCache.invalidateWorkspace(id);

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

  async getUsersNotInWorkspace(workspaceId: string) {
    return this.workspacesRepository.getUsersNotInWorkspace(workspaceId);
  }

  async addMember(data: AddMemberData) {
    const result = await this.workspacesRepository.addMember(data);
    // Invalidate user workspaces cache when member is added
    workspaceCache.invalidateUserWorkspaces(data.userId);
    return result;
  }

  async addPendingMember(data: {
    workspaceId: string;
    userId: string;
    role: WorkspaceMemberRole;
    invitationToken: string;
    invitationExpiresAt: Date;
    invitedBy: string;
  }) {
    const result = await this.workspacesRepository.addPendingMember(data);
    // Invalidate user workspaces cache when member is added
    workspaceCache.invalidateUserWorkspaces(data.userId);
    return result;
  }

  async getPendingMembers(workspaceId: string) {
    return this.workspacesRepository.getPendingMembers(workspaceId);
  }

  async getPendingInvitationsForUser(userId: string) {
    return this.workspacesRepository.getPendingInvitationsForUser(userId);
  }

  async getByIds(workspaceIds: string[]) {
    return this.workspacesRepository.getByIds(workspaceIds);
  }

  async getMemberByInvitationToken(token: string) {
    return this.workspacesRepository.getMemberByInvitationToken(token);
  }

  async getPendingMemberById(memberId: string, workspaceId: string) {
    return this.workspacesRepository.getPendingMemberById(memberId, workspaceId);
  }

  async activateMember(memberId: string) {
    return this.workspacesRepository.activateMember(memberId);
  }

  async updateMemberInvitationToken(memberId: string, token: string, expiresAt: Date) {
    return this.workspacesRepository.updateMemberInvitationToken(memberId, token, expiresAt);
  }

  async listUserWorkspaces(userId: string) {
    return this.getUserWorkspaces(userId);
  }

  async removeMember(workspaceId: string, userId: string) {
    const result = await this.workspacesRepository.removeMember(workspaceId, userId);
    // Invalidate user workspaces cache when member is removed
    workspaceCache.invalidateUserWorkspaces(userId);
    return result;
  }

  async removePendingMemberById(memberId: string, workspaceId: string): Promise<boolean> {
    return this.workspacesRepository.removeMemberById(memberId, workspaceId);
  }

  async updateMemberRole(workspaceId: string, userId: string, role: WorkspaceMemberRole) {
    return this.workspacesRepository.updateMemberRole(workspaceId, userId, role);
  }

  async getUserWorkspaces(userId: string) {
    const cacheKey = workspaceCache.createUserWorkspacesKey(userId);
    const cached =
      workspaceCache.get<Awaited<ReturnType<typeof this.workspacesRepository.getUserWorkspaces>>>(
        cacheKey,
      );
    if (cached) return cached;

    const result = await this.workspacesRepository.getUserWorkspaces(userId);
    workspaceCache.set(cacheKey, result);
    return result;
  }

  async getMemberWithRole(
    workspaceId: string,
    userId: string,
  ): Promise<{
    role: WorkspaceMemberRole;
    status: string;
    id: string;
    userId: string;
    workspaceId: string;
    invitationToken: string | null;
    invitationExpiresAt: Date | null;
    invitedBy: string | null;
  } | null> {
    const member = await this.workspacesRepository.getMember(workspaceId, userId);
    return member
      ? {
          role: member.role as WorkspaceMemberRole,
          status: member.status,
          id: member.id,
          userId: member.userId,
          workspaceId: member.workspaceId,
          invitationToken: member.invitationToken,
          invitationExpiresAt: member.invitationExpiresAt,
          invitedBy: member.invitedBy,
        }
      : null;
  }

  async ensureUserInWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberRole | null> {
    const member = await this.workspacesRepository.getMember(workspaceId, userId);
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
