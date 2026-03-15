/**
 * Invitations service - business logic for workspace invitations
 */

import {
  generateInviteToken,
  getDefaultExpiresAt,
  invitationsRepository,
} from "../repositories/invitations.repository";
import type { UsersService } from "./users.service";
import type { WorkspacesService } from "./workspaces.service";

export type CreateUserFn = (opts: {
  email: string;
  password: string;
  name: string;
  givenName?: string;
  familyName?: string;
}) => Promise<{ id: string }>;

export class InvitationsService {
  constructor(
    private workspacesService: WorkspacesService,
    private usersService: UsersService,
  ) {}

  async createInvitation(
    workspaceId: string,
    email: string,
    role: "owner" | "admin" | "member",
    invitedBy: string,
  ): Promise<{ id: string; token: string; expiresAt: Date } | null> {
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new Error("Некорректный email");
    }

    const hasPending = await invitationsRepository.hasPendingForEmail(
      workspaceId,
      trimmedEmail,
    );
    if (hasPending) {
      throw new Error("Приглашение на этот email уже отправлено");
    }

    const existingUser =
      await this.usersService.getUserByUsername(trimmedEmail);
    if (existingUser) {
      const member = await this.workspacesService.getMemberWithRole(
        workspaceId,
        existingUser.id,
      );
      if (member) {
        throw new Error(
          "Пользователь уже является участником рабочего пространства",
        );
      }
    }

    const token = generateInviteToken();
    const expiresAt = getDefaultExpiresAt();

    const id = await invitationsRepository.create({
      workspaceId,
      email: trimmedEmail,
      role,
      token,
      invitedBy,
      expiresAt,
    });

    if (!id) return null;

    return { id, token, expiresAt };
  }

  async getByToken(token: string) {
    return invitationsRepository.findValidByToken(token);
  }

  async listByWorkspace(workspaceId: string) {
    return invitationsRepository.listByWorkspace(workspaceId);
  }

  async revoke(invitationId: string, workspaceId: string, _userId: string) {
    const list = await invitationsRepository.listByWorkspace(workspaceId);
    const inv = list.find((i) => i.id === invitationId);
    if (!inv) return false;
    return invitationsRepository.revoke(invitationId);
  }

  async acceptInvitation(
    token: string,
    password: string,
    name: string | undefined,
    createUserFn: CreateUserFn,
  ): Promise<{ userId: string }> {
    const inv = await invitationsRepository.findValidByToken(token);
    if (!inv) {
      throw new Error("Приглашение не найдено или истекло");
    }

    if (!password || password.length < 8) {
      throw new Error("Пароль должен быть не менее 8 символов");
    }

    const emailPart = inv.email.split("@")[0];
    const displayName = (name ?? emailPart ?? inv.email).trim() || inv.email;

    const { id: userId } = await createUserFn({
      email: inv.email,
      password,
      name: displayName,
      givenName: displayName,
      familyName: "",
    });

    const role = (inv.role ?? "member") as "owner" | "admin" | "member";
    await this.workspacesService.addMember({
      workspaceId: inv.workspaceId,
      userId,
      role,
    });

    await invitationsRepository.markAccepted(inv.id, userId);

    return { userId };
  }
}
