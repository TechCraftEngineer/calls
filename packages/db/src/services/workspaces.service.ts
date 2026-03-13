/**
 * Workspaces service - business logic for workspace operations
 */

import { db } from "../client";
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
  ): Promise<number> {
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

  async getById(id: number) {
    return this.workspacesRepository.getById(id);
  }

  async getBySlug(slug: string) {
    return this.workspacesRepository.getBySlug(slug);
  }

  async update(
    id: number,
    data: { name?: string; slug?: string; metadata?: string | null },
  ) {
    return this.workspacesRepository.update(id, data);
  }

  async delete(id: number) {
    return this.workspacesRepository.delete(id);
  }

  async getMembers(workspaceId: number) {
    return this.workspacesRepository.getMembers(workspaceId);
  }

  async addMember(data: AddMemberData) {
    return this.workspacesRepository.addMember(data);
  }

  async removeMember(workspaceId: number, userId: string) {
    return this.workspacesRepository.removeMember(workspaceId, userId);
  }

  async updateMemberRole(
    workspaceId: number,
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
    return this.workspacesRepository.getUserWorkspaces(userId);
  }

  async getMemberWithRole(
    workspaceId: number,
    userId: string,
  ): Promise<{ role: WorkspaceMemberRole } | null> {
    const member = await this.workspacesRepository.getMember(
      workspaceId,
      userId,
    );
    return member ? { role: member.role as WorkspaceMemberRole } : null;
  }

  async ensureUserInWorkspace(
    workspaceId: number,
    userId: string,
  ): Promise<WorkspaceMemberRole | null> {
    const member = await this.workspacesRepository.getMember(
      workspaceId,
      userId,
    );
    return (member?.role as WorkspaceMemberRole) ?? null;
  }
}
