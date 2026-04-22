/**
 * Invitations service - business logic for workspace invitations
 *
 * Two flows:
 * - Existing user: add to workspace_members with status='pending'
 * - New user: store in invitations table (no user created). User is created
 *   via Better Auth only when they accept the invitation.
 */

import { z } from "zod";
import type { InvitationsRepository } from "../repositories/invitations.repository";
import { generateInviteToken, getDefaultExpiresAt } from "../repositories/invitations.repository";
import type { UserWorkspaceSettingsRepository } from "../repositories/user-workspace-settings.repository";
import type { UsersService } from "./users";
import type { WorkspacesService } from "./workspaces.service";

export class InvitationsService {
  constructor(
    public workspacesService: WorkspacesService,
    public usersService: UsersService,
    private userWorkspaceSettingsRepository: UserWorkspaceSettingsRepository,
    private invitationsRepository: InvitationsRepository,
  ) {}

  /**
   * Валидация настроек из pendingSettings
   */
  private validatePendingSettings(
    settings: Record<string, unknown>,
  ): Record<string, unknown> | null {
    try {
      const validated: Record<string, unknown> = {};

      // Валидация email настроек (Zod)
      if (settings.email && typeof settings.email === "string") {
        if (z.email().safeParse(settings.email).success) {
          validated.email = settings.email;
        }
      }

      // Валидация boolean настроек отчетов
      const booleanFields = [
        "email_daily_report",
        "email_weekly_report",
        "email_monthly_report",
        "telegram_daily_report",
        "telegram_weekly_report",
        "telegram_monthly_report",
        "telegram_skip_weekends",
        "report_include_call_summaries",
        "report_detailed",
        "report_include_avg_value",
        "report_include_avg_rating",
        "filter_exclude_answering_machine",
      ];

      for (const field of booleanFields) {
        if (field in settings && typeof settings[field] === "boolean") {
          validated[field] = settings[field];
        }
      }

      // Валидация числовых полей (неотрицательные)
      const numericFields = [
        "filter_min_duration",
        "filter_min_replicas",
        "kpi_base_salary",
        "kpi_target_bonus",
        "kpi_target_talk_time_minutes",
      ];

      for (const field of numericFields) {
        if (field in settings && typeof settings[field] === "number" && settings[field] >= 0) {
          validated[field] = settings[field];
        }
      }

      // Валидация времени
      const timeFields = ["report_daily_time", "report_weekly_time", "report_monthly_time"];
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

      for (const field of timeFields) {
        if (
          field in settings &&
          typeof settings[field] === "string" &&
          timeRegex.test(settings[field])
        ) {
          validated[field] = settings[field];
        }
      }

      // Валидация дней недели
      if ("report_weekly_day" in settings) {
        const validDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
        if (validDays.includes(settings.report_weekly_day as string)) {
          validated.report_weekly_day = settings.report_weekly_day;
        }
      }

      // Валидация дня месяца
      if ("report_monthly_day" in settings) {
        const validDays = ["1", "15", "last"];
        if (validDays.includes(settings.report_monthly_day as string)) {
          validated.report_monthly_day = settings.report_monthly_day;
        }
      }

      // Валидация массива ID пользователей
      if (
        "report_managed_user_ids" in settings &&
        Array.isArray(settings.report_managed_user_ids)
      ) {
        const validIds = settings.report_managed_user_ids.filter(
          (id) => typeof id === "number" && id > 0,
        );
        if (validIds.length > 0) {
          validated.report_managed_user_ids = validIds;
        }
      }

      return Object.keys(validated).length > 0 ? validated : null;
    } catch (_error) {
      // При ошибке валидации возвращаем null, чтобы не сохранять некорректные данные
      return null;
    }
  }

  /**
   * Create link-based invitation - anyone with the link can join
   */
  async createLinkInvitation(
    workspaceId: string,
    role: "owner" | "admin" | "member",
    invitedBy: string,
  ): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    const token = generateInviteToken();
    const expiresAt = getDefaultExpiresAt();

    await this.invitationsRepository.createLinkInvitation({
      workspaceId,
      role,
      token,
      invitedBy,
      expiresAt,
    });

    return {
      token,
      expiresAt,
    };
  }

  /**
   * Create invitation - for existing users adds to workspace_members with pending,
   * for new users stores in invitations table (user created only when they accept).
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
    const emailResult = z.email({ message: "Некорректный email" }).safeParse(trimmedEmail);
    if (!emailResult.success) {
      const firstIssue = emailResult.error.issues[0];
      throw new Error(firstIssue?.message ?? "Некорректный email");
    }
    const validatedEmail = emailResult.data;

    const user = await this.usersService.getUserByEmail(validatedEmail);
    const userExists = !!user;
    const requiresPassword = !userExists;

    if (user) {
      // Existing user: add to workspace_members with pending status
      const member = await this.workspacesService.getMemberWithRole(workspaceId, user.id);
      if (member) {
        throw new Error("Пользователь уже является участником рабочего пространства");
      }

      const token = generateInviteToken();
      const expiresAt = getDefaultExpiresAt();

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

    // New user: check for existing pending invitation
    const hasPending = await this.invitationsRepository.hasPendingForEmail(
      workspaceId,
      validatedEmail,
    );
    if (hasPending) {
      throw new Error("Приглашение на этот email уже отправлено и ожидает принятия");
    }

    const token = generateInviteToken();
    const expiresAt = getDefaultExpiresAt();

    await this.invitationsRepository.create({
      workspaceId,
      email: validatedEmail,
      role,
      token,
      invitedBy,
      expiresAt,
    });

    return {
      userId: "",
      token,
      expiresAt,
      userExists,
      requiresPassword,
    };
  }

  /**
   * Get invitation by token - for invite page display.
   * Checks workspace_members (existing users) first, then invitations table (new users).
   */
  async getByToken(token: string): Promise<{
    email: string | null;
    role: "owner" | "admin" | "member";
    expiresAt: Date;
    workspaceId: string;
    workspaceName: string;
    userExists: boolean;
    requiresPassword: boolean;
    invitationType: "email" | "link";
  } | null> {
    // 1. Check workspace_members (existing users)
    const member = await this.workspacesService.getMemberByInvitationToken(token);

    if (member && member.status === "pending") {
      const expiresAt = member.invitationExpiresAt;
      if (expiresAt && expiresAt >= new Date()) {
        // Используем Promise.all для параллельных запросов
        const [user, workspace] = await Promise.all([
          this.usersService.getUser(member.userId),
          this.workspacesService.getById(member.workspaceId),
        ]);

        if (user && workspace && user.email) {
          return {
            email: user.email,
            role: member.role as "owner" | "admin" | "member",
            expiresAt,
            workspaceId: member.workspaceId,
            workspaceName: workspace.name,
            userExists: true,
            requiresPassword: false, // Существующий пользователь входит своим паролем
            invitationType: "email",
          };
        }
      }
    }

    // 2. Check invitations table (new users - not yet in system)
    const inv = await this.invitationsRepository.findValidByToken(token);
    if (!inv) return null;

    const workspace = await this.workspacesService.getById(inv.workspaceId);
    if (!workspace) return null;

    return {
      email: inv.email ?? null,
      role: inv.role as "owner" | "admin" | "member",
      expiresAt: inv.expiresAt,
      workspaceId: inv.workspaceId,
      workspaceName: workspace.name,
      userExists: false,
      requiresPassword: true, // Новый пользователь создаёт пароль при регистрации
      invitationType: (inv.invitationType as "email" | "link") ?? "email",
    };
  }

  /**
   * Get pending members for a workspace
   */
  async listPendingByWorkspace(workspaceId: string) {
    return this.workspacesService.getPendingMembers(workspaceId);
  }

  /**
   * Get pending members with their settings for a workspace
   */
  async listPendingByWorkspaceWithSettings(workspaceId: string) {
    const rows = await this.workspacesService.getPendingMembers(workspaceId);
    const withSettings = await Promise.all(
      rows.map(async (r) => {
        const settings = await this.userWorkspaceSettingsRepository.findByUserAndWorkspace(
          r.userId,
          workspaceId,
        );
        return {
          ...r,
          pendingSettings: settings
            ? ({
                notificationSettings: settings.notificationSettings,
                reportSettings: settings.reportSettings,
                kpiSettings: settings.kpiSettings,
                filterSettings: settings.filterSettings,
                evaluationSettings: settings.evaluationSettings,
              } as Record<string, unknown>)
            : undefined,
        };
      }),
    );
    return withSettings;
  }

  /**
   * Get all pending invitations for a user (for onboarding redirect).
   * Combines: invitations table (by email) + workspace_members (by userId, status=pending).
   */
  async getPendingInvitationsForUser(
    userId: string,
    email: string,
  ): Promise<Array<{ token: string; workspaceName: string }>> {
    try {
      const [fromInvitations, fromMembers] = await Promise.all([
        this.invitationsRepository.findPendingByEmail(email),
        this.workspacesService.getPendingInvitationsForUser(userId),
      ]);

      const workspaceIds = [
        ...new Set([
          ...fromInvitations.map((i) => i.workspaceId),
          ...fromMembers.map((m) => m.workspaceId),
        ]),
      ];

      // Оптимизация: один запрос вместо N+1
      const workspaces = await this.workspacesService.getByIds(workspaceIds);
      const workspacesMap = new Map(workspaces.map((ws) => [ws.id, ws.name]));

      const result: Array<{ token: string; workspaceName: string }> = [];

      for (const inv of fromInvitations) {
        const name = workspacesMap.get(inv.workspaceId) ?? "Рабочее пространство";
        result.push({ token: inv.token, workspaceName: name });
      }
      for (const m of fromMembers) {
        if (m.token) {
          const name = workspacesMap.get(m.workspaceId) ?? "Рабочее пространство";
          result.push({ token: m.token, workspaceName: name });
        }
      }

      return result;
    } catch (error) {
      console.error("Error in getPendingInvitationsForUser:", {
        userId,
        email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List all pending invitations for a workspace (workspace_members + invitations table)
   */
  async listAllPendingForWorkspace(workspaceId: string): Promise<
    Array<{
      id: string;
      email: string | null;
      role: string;
      token: string | null;
      expiresAt: Date | null;
      createdAt: Date;
      invitedBy: string | null;
      pendingSettings?: Record<string, unknown>;
      invitationType: "email" | "link";
    }>
  > {
    const [members, invRows] = await Promise.all([
      this.listPendingByWorkspaceWithSettings(workspaceId),
      this.invitationsRepository.listByWorkspace(workspaceId),
    ]);

    const fromMembers = members.map((r) => ({
      id: r.id,
      email: r.user.email,
      role: r.role,
      token: r.invitationToken,
      expiresAt: r.invitationExpiresAt,
      createdAt: r.createdAt,
      invitedBy: r.invitedBy,
      invitationType: "email" as const,
      pendingSettings: r.pendingSettings as Record<string, unknown> | undefined,
    }));

    const fromInvitations = invRows.map((inv) => ({
      id: inv.id,
      email: inv.email ?? null,
      role: inv.role,
      token: inv.token,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      invitedBy: inv.invitedBy,
      invitationType: (inv.email ? "email" : "link") as "email" | "link",
      pendingSettings: inv.pendingSettings as Record<string, unknown> | undefined,
    }));

    return [...fromMembers, ...fromInvitations].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Accept invitation - for workspace_members: set password if needed, activate;
   * for invitations table: create user via Better Auth, add to workspace, mark accepted.
   * For link-based invitations, email must be provided.
   */
  async acceptInvitation(
    token: string,
    password?: string,
    name?: string,
    email?: string,
    createUserFn?: (opts: {
      email: string;
      password: string;
      name: string;
      givenName?: string;
      familyName?: string;
    }) => Promise<{ id: string }>,
    setPasswordFn?: (userId: string, newPassword: string) => Promise<void>,
  ): Promise<{ userId: string; workspaceId: string }> {
    // 1. Try workspace_members (existing users)
    const member = await this.workspacesService.getMemberByInvitationToken(token);

    if (member && member.status === "pending") {
      if (member.invitationExpiresAt && member.invitationExpiresAt < new Date()) {
        throw new Error("Срок действия приглашения истек");
      }

      // Проверяем, что приглашение еще не принято (защита от race condition)
      const currentMember = await this.workspacesService.getMemberWithRole(
        member.workspaceId,
        member.userId,
      );
      if (currentMember && currentMember.status !== "pending") {
        throw new Error("Приглашение уже принято");
      }

      // Для существующих пользователей устанавливаем пароль только если у них НЕТ credential аккаунта
      if (password && setPasswordFn) {
        console.log(
          `[InvitationsService] Checking password setup for existing user: ${member.userId}`,
        );
        try {
          await setPasswordFn(member.userId, password);
          console.log(`[InvitationsService] Password setup completed for user: ${member.userId}`);
        } catch (error) {
          console.error(
            `[InvitationsService] Failed to set up password for user: ${member.userId}`,
            error,
          );
          throw error;
        }
      } else if (!password) {
        console.log(
          `[InvitationsService] No password provided for existing user: ${member.userId}`,
        );
      } else if (!setPasswordFn) {
        console.log(`[InvitationsService] setPasswordFn not available for user: ${member.userId}`);
      }

      // Атомарно обновляем статус с проверкой
      const updated = await this.workspacesService.activateMember(member.id);
      if (!updated) {
        throw new Error("Не удалось активировать приглашение");
      }

      return {
        userId: member.userId,
        workspaceId: member.workspaceId,
      };
    }

    // 2. Try invitations table (new users - not in system yet)
    const inv = await this.invitationsRepository.findValidByToken(token);
    if (!inv) {
      throw new Error("Приглашение не найдено или уже принято");
    }

    if (!createUserFn || !password || password.length < 8) {
      throw new Error("Пароль должен быть не менее 8 символов");
    }

    // Дополнительная проверка, что приглашение еще не принято
    if (inv.acceptedAt) {
      throw new Error("Приглашение уже принято");
    }

    // For link-based invitations, email must be provided
    const invitationEmail =
      inv.invitationType === "link" ? email?.toLowerCase().trim() : inv.email?.toLowerCase().trim();

    if (!invitationEmail) {
      throw new Error("Email обязателен для принятия приглашения");
    }

    // Validate email format
    const emailResult = z.email({ message: "Некорректный email" }).safeParse(invitationEmail);
    if (!emailResult.success) {
      throw new Error("Некорректный email");
    }

    // Check if user with this email already exists
    const existingUser = await this.usersService.getUserByEmail(invitationEmail);
    let userId: string;

    if (existingUser) {
      // Existing user: add to workspace_members with pending status instead of throwing
      // This allows the user to accept the link invitation after authentication
      const member = await this.workspacesService.getMemberWithRole(
        inv.workspaceId,
        existingUser.id,
      );
      if (member) {
        throw new Error("Пользователь уже является участником рабочего пространства");
      }

      const newToken = generateInviteToken();
      const expiresAt = getDefaultExpiresAt();

      await this.workspacesService.addPendingMember({
        workspaceId: inv.workspaceId,
        userId: existingUser.id,
        role: inv.role as "owner" | "admin" | "member",
        invitationToken: newToken,
        invitationExpiresAt: expiresAt,
        invitedBy: inv.invitedBy,
      });

      // Mark the invitation as accepted since we've linked it to the existing user
      await this.invitationsRepository.markAccepted(inv.id, existingUser.id);

      return {
        userId: existingUser.id,
        workspaceId: inv.workspaceId,
      };
    }

    const displayName = name?.trim() || invitationEmail.split("@")[0] || "User";
    const createdUser = await createUserFn({
      email: invitationEmail,
      password,
      name: displayName,
      givenName: displayName,
      familyName: "",
    });

    userId = createdUser.id;

    await this.workspacesService.addMember({
      workspaceId: inv.workspaceId,
      userId,
      role: inv.role as "owner" | "admin" | "member",
    });

    if (inv.pendingSettings && Object.keys(inv.pendingSettings).length > 0) {
      // Валидация настроек перед сохранением
      const validatedSettings = this.validatePendingSettings(
        inv.pendingSettings as Record<string, unknown>,
      );
      if (validatedSettings) {
        await this.userWorkspaceSettingsRepository.upsert(
          userId,
          inv.workspaceId,
          validatedSettings as Parameters<UserWorkspaceSettingsRepository["upsert"]>[2],
        );
      }
    }

    // Помечаем приглашение как принято с проверкой на дублирование
    const markedAccepted = await this.invitationsRepository.markAccepted(inv.id, userId);
    if (!markedAccepted) {
      throw new Error("Не удалось отметить приглашение как принятое");
    }

    return {
      userId,
      workspaceId: inv.workspaceId,
    };
  }

  /**
   * Resend invitation - generates new token for pending member
   */
  async resendInvitation(
    workspaceId: string,
    userId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const member = await this.workspacesService.getMemberWithRole(workspaceId, userId);

    if (!member || member.status !== "pending") {
      throw new Error("Приглашение не найдено или уже принято");
    }

    // Generate new token and expiration
    const token = generateInviteToken();
    const expiresAt = getDefaultExpiresAt();

    await this.workspacesService.updateMemberInvitationToken(member.id, token, expiresAt);

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
    const member = await this.workspacesService.getMemberByInvitationToken(token);

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
   * Revoke invitation by id - tries workspace_members first, then invitations table
   */
  async revoke(invitationId: string, workspaceId: string, _authUserId: string): Promise<boolean> {
    const removedMember = await this.workspacesService.removePendingMemberById(
      invitationId,
      workspaceId,
    );
    if (removedMember) return true;

    return this.invitationsRepository.revokeByIdAndWorkspace(invitationId, workspaceId);
  }

  /**
   * Update invitation settings - for workspace_members or invitations table
   */
  async updateInvitationSettings(
    invitationId: string,
    workspaceId: string,
    settings: Record<string, unknown>,
  ): Promise<boolean> {
    // Валидация настроек перед сохранением
    const validatedSettings = this.validatePendingSettings(settings);
    if (!validatedSettings) {
      throw new Error("Некорректные настройки приглашения");
    }

    const member = await this.workspacesService.getPendingMemberById(invitationId, workspaceId);
    if (member) {
      return this.userWorkspaceSettingsRepository.upsert(
        member.userId,
        workspaceId,
        validatedSettings as Parameters<UserWorkspaceSettingsRepository["upsert"]>[2],
      );
    }

    const inv = await this.invitationsRepository.findByIdAndWorkspace(invitationId, workspaceId);
    if (!inv) {
      throw new Error("Приглашение не найдено или уже принято");
    }
    return this.invitationsRepository.updatePendingSettings(invitationId, validatedSettings);
  }

  /**
   * Revoke invitation - removes pending member from workspace
   */
  async revokeInvitation(workspaceId: string, userId: string): Promise<void> {
    const member = await this.workspacesService.getMemberWithRole(workspaceId, userId);

    if (!member || member.status !== "pending") {
      throw new Error("Приглашение не найдено");
    }

    // Remove from workspace
    await this.workspacesService.removeMember(workspaceId, userId);
  }
}
