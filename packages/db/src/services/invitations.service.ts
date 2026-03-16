/**
 * Invitations service - business logic for workspace invitations
 *
 * Correct approach: Invitation status is stored in workspace_members table.
 * Users are created immediately when invited, and workspace_member has status='pending'.
 * This allows configuring users before they accept the invitation.
 */

import { randomUUID } from "node:crypto";
import {
  generateInviteToken,
  getDefaultExpiresAt,
} from "../repositories/invitations.repository";
import type { UsersService } from "./users.service";
import type { WorkspacesService } from "./workspaces.service";

export class InvitationsService {
  constructor(
    public workspacesService: WorkspacesService,
    public usersService: UsersService,
  ) {}

  /**
   * Create invitation - creates user if needed and adds to workspace with pending status
   */
  async createInvitation(
    workspaceId: string,
    email: string,
    role: "owner" | "admin" | "member",
    invitedBy: string,
  ): Promise<{
    userId: string;
    token: string;
    expiresAt: Date;
    userExists: boolean;
    requiresPassword: boolean;
  }> {
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new Error("Некорректный email");
    }

    // Check if user already exists
    let user = await this.usersService.getUserByEmail(trimmedEmail);
    const userExists = !!user;
    let requiresPassword = false;

    if (user) {
      // Check if already a member (active or pending)
      const member = await this.workspacesService.getMemberWithRole(
        workspaceId,
        user.id,
      );
      if (member) {
        throw new Error(
          "Пользователь уже является участником рабочего пространства",
        );
      }
    } else {
      // Create new user with temporary password (will be changed during invitation acceptance)
      const emailPrefix = trimmedEmail.split("@")[0] || "User";
      const tempPassword = randomUUID(); // Temporary password, will be updated

      await this.usersService.createUser(
        {
          email: trimmedEmail,
          password: tempPassword,
          givenName: emailPrefix,
          familyName: "",
          internalExtensions: null,
          mobilePhones: null,
        },
        workspaceId,
      );

      user = await this.usersService.getUserByEmail(trimmedEmail);
      if (!user) {
        throw new Error("Failed to create user");
      }
      requiresPassword = true;
    }

    // Generate invitation token
    const token = generateInviteToken();
    const expiresAt = getDefaultExpiresAt();

    // Add to workspace with pending status
    await this.workspacesService.addPendingMember({
      workspaceId,
      userId: user.id,
      role,
      invitationToken: token,
      invitationExpiresAt: expiresAt,
      invitedBy,
    });

    return {
      userId: user.id,
      token,
      expiresAt,
      userExists,
      requiresPassword,
    };
  }

  /**
   * Get pending members for a workspace
   */
  async listPendingByWorkspace(workspaceId: string) {
    return this.workspacesService.getPendingMembers(workspaceId);
  }

  /**
   * Accept invitation - updates workspace_member status to active
   */
  async acceptInvitation(
    token: string,
    password?: string,
  ): Promise<{ userId: string; workspaceId: string }> {
    // Find member by invitation token
    const member =
      await this.workspacesService.getMemberByInvitationToken(token);

    if (!member || member.status !== "pending") {
      throw new Error("Приглашение не найдено или уже принято");
    }

    if (member.invitationExpiresAt && member.invitationExpiresAt < new Date()) {
      throw new Error("Срок действия приглашения истек");
    }

    // If password provided, set it for new users
    if (password) {
      if (password.length < 8) {
        throw new Error("Пароль должен быть не менее 8 символов");
      }

      // Check if this is a new user (no password set yet)
      const user = await this.usersService.getUser(member.userId);
      if (user) {
        // For new users, we need to set their password
        // This would typically be done through Better Auth's password update API
        // For now, we'll store this information and let the auth layer handle it
        // The actual password setting happens in the route handler via Better Auth
      }
    }

    // Activate membership
    await this.workspacesService.activateMember(member.id);

    return {
      userId: member.userId,
      workspaceId: member.workspaceId,
    };
  }

  /**
   * Resend invitation - generates new token for pending member
   */
  async resendInvitation(
    workspaceId: string,
    userId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const member = await this.workspacesService.getMemberWithRole(
      workspaceId,
      userId,
    );

    if (!member || member.status !== "pending") {
      throw new Error("Приглашение не найдено или уже принято");
    }

    // Generate new token and expiration
    const token = generateInviteToken();
    const expiresAt = getDefaultExpiresAt();

    await this.workspacesService.updateMemberInvitationToken(
      member.id,
      token,
      expiresAt,
    );

    return { token, expiresAt };
  }

  /**
   * Accept invitation for existing user - validates email match and activates membership
   */
  async acceptInvitationForExistingUser(
    token: string,
    userId: string,
  ): Promise<{ workspaceId: string; workspaceName: string }> {
    // Find member by invitation token
    const member =
      await this.workspacesService.getMemberByInvitationToken(token);

    if (!member || member.status !== "pending") {
      throw new Error("Приглашение не найдено или уже принято");
    }

    if (member.invitationExpiresAt && member.invitationExpiresAt < new Date()) {
      throw new Error("Срок действия приглашения истек");
    }

    // Verify that the accepting user matches the invited user
    if (member.userId !== userId) {
      throw new Error("Приглашение предназначено для другого пользователя");
    }

    // Get workspace details for response
    const workspace = await this.workspacesService.getById(member.workspaceId);
    if (!workspace) {
      throw new Error("Рабочее пространство не найдено");
    }

    // Activate membership
    await this.workspacesService.activateMember(member.id);

    return {
      workspaceId: member.workspaceId,
      workspaceName: workspace.name,
    };
  }

  /**
   * Revoke invitation by member id (workspace_member.id) - used by API
   */
  async revoke(
    memberId: string,
    workspaceId: string,
    _authUserId: string,
  ): Promise<boolean> {
    return this.workspacesService.removePendingMemberById(
      memberId,
      workspaceId,
    );
  }

  /**
   * Revoke invitation - removes pending member from workspace
   */
  async revokeInvitation(workspaceId: string, userId: string): Promise<void> {
    const member = await this.workspacesService.getMemberWithRole(
      workspaceId,
      userId,
    );

    if (!member || member.status !== "pending") {
      throw new Error("Приглашение не найдено");
    }

    // Remove from workspace
    await this.workspacesService.removeMember(workspaceId, userId);

    // Check if user is in any other workspaces
    const userWorkspaces =
      await this.workspacesService.listUserWorkspaces(userId);

    // If not in any workspace and has no password, can delete the user
    // (This is optional - you might want to keep the user record)
    if (userWorkspaces.length === 0) {
      const _user = await this.usersService.getUser(userId);
      // Only delete if user never set a password (never logged in)
      // This check would need to be implemented based on your auth system
    }
  }
}
