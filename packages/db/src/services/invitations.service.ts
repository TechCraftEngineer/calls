/**
 * Invitations service - business logic for workspace invitations
 *
 * Two flows:
 * - Existing user: add to workspace_members with status='pending'
 * - New user: store in invitations table (no user created). User is created
 *   via Better Auth only when they accept the invitation.
 */

import type { InvitationsRepository } from "../repositories/invitations.repository";
import {
  generateInviteToken,
  getDefaultExpiresAt,
} from "../repositories/invitations.repository";
import type { UserWorkspaceSettingsRepository } from "../repositories/user-workspace-settings.repository";
import type { UsersService } from "./users.service";
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
  private validatePendingSettings(settings: Record<string, unknown>): Record<string, unknown> | null {
    try {
      const validated: Record<string, unknown> = {};
      
      // Валидация email настроек
      if (settings.email && typeof settings.email === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(settings.email)) {
          validated.email = settings.email;
        }
      }
      
      // Валидация boolean настроек отчетов
      const booleanFields = [
        'email_daily_report', 'email_weekly_report', 'email_monthly_report',
        'telegram_daily_report', 'telegram_weekly_report', 'telegram_monthly_report',
        'telegram_skip_weekends', 'report_include_call_summaries', 'report_detailed',
        'report_include_avg_value', 'report_include_avg_rating',
        'filter_exclude_answering_machine'
      ];
      
      for (const field of booleanFields) {
        if (field in settings && typeof settings[field] === 'boolean') {
          validated[field] = settings[field];
        }
      }
      
      // Валидация числовых полей (неотрицательные)
      const numericFields = [
        'filter_min_duration', 'filter_min_replicas', 'kpi_base_salary',
        'kpi_target_bonus', 'kpi_target_talk_time_minutes'
      ];
      
      for (const field of numericFields) {
        if (field in settings && typeof settings[field] === 'number' && settings[field] >= 0) {
          validated[field] = settings[field];
        }
      }
      
      // Валидация времени
      const timeFields = ['report_daily_time', 'report_weekly_time', 'report_monthly_time'];
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      for (const field of timeFields) {
        if (field in settings && typeof settings[field] === 'string' && timeRegex.test(settings[field])) {
          validated[field] = settings[field];
        }
      }
      
      // Валидация дней недели
      if ('report_weekly_day' in settings) {
        const validDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        if (validDays.includes(settings.report_weekly_day as string)) {
          validated.report_weekly_day = settings.report_weekly_day;
        }
      }
      
      // Валидация дня месяца
      if ('report_monthly_day' in settings) {
        const validDays = ['1', '15', 'last'];
        if (validDays.includes(settings.report_monthly_day as string)) {
          validated.report_monthly_day = settings.report_monthly_day;
        }
      }
      
      // Валидация массива ID пользователей
      if ('report_managed_user_ids' in settings && Array.isArray(settings.report_managed_user_ids)) {
        const validIds = settings.report_managed_user_ids.filter(id => 
          typeof id === 'number' && id > 0
        );
        if (validIds.length > 0) {
          validated.report_managed_user_ids = validIds;
        }
      }
      
      return Object.keys(validated).length > 0 ? validated : null;
    } catch (error) {
      // При ошибке валидации возвращаем null, чтобы не сохранять некорректные данные
      return null;
    }
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
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      throw new Error("Некорректный email");
    }

    const user = await this.usersService.getUserByEmail(trimmedEmail);
    const userExists = !!user;
    const requiresPassword = !userExists;

    if (user) {
      // Existing user: add to workspace_members with pending status
      const member = await this.workspacesService.getMemberWithRole(
        workspaceId,
        user.id,
      );
      if (member) {
        throw new Error(
          "Пользователь уже является участником рабочего пространства",
        );
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
      trimmedEmail,
    );
    if (hasPending) {
      throw new Error(
        "Приглашение на этот email уже отправлено и ожидает принятия",
      );
    }

    const token = generateInviteToken();
    const expiresAt = getDefaultExpiresAt();

    await this.invitationsRepository.create({
      workspaceId,
      email: trimmedEmail,
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
    email: string;
    role: "owner" | "admin" | "member";
    expiresAt: Date;
    workspaceId: string;
    workspaceName: string;
    userExists: boolean;
  } | null> {
    // 1. Check workspace_members (existing users)
    const member =
      await this.workspacesService.getMemberByInvitationToken(token);

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
      email: inv.email,
      role: inv.role as "owner" | "admin" | "member",
      expiresAt: inv.expiresAt,
      workspaceId: inv.workspaceId,
      workspaceName: workspace.name,
      userExists: false,
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
        const settings =
          await this.userWorkspaceSettingsRepository.findByUserAndWorkspace(
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
   * List all pending invitations for a workspace (workspace_members + invitations table)
   */
  async listAllPendingForWorkspace(workspaceId: string): Promise<
    Array<{
      id: string;
      email: string;
      role: string;
      token: string | null;
      expiresAt: Date | null;
      createdAt: Date;
      invitedBy: string | null;
      pendingSettings?: Record<string, unknown>;
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
      pendingSettings: r.pendingSettings as Record<string, unknown> | undefined,
    }));

    const fromInvitations = invRows.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      token: inv.token,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      invitedBy: inv.invitedBy,
      pendingSettings: inv.pendingSettings as
        | Record<string, unknown>
        | undefined,
    }));

    return [...fromMembers, ...fromInvitations].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /**
   * Accept invitation - for workspace_members: set password if needed, activate;
   * for invitations table: create user via Better Auth, add to workspace, mark accepted.
   */
  async acceptInvitation(
    token: string,
    password?: string,
    name?: string,
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
    const member =
      await this.workspacesService.getMemberByInvitationToken(token);

    if (member && member.status === "pending") {
      if (
        member.invitationExpiresAt &&
        member.invitationExpiresAt < new Date()
      ) {
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

      if (password && password.length >= 8 && setPasswordFn) {
        await setPasswordFn(member.userId, password);
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

    const displayName = name?.trim() || inv.email.split("@")[0] || "User";
    const { id: userId } = await createUserFn({
      email: inv.email,
      password,
      name: displayName,
      givenName: displayName,
      familyName: "",
    });

    await this.workspacesService.addMember({
      workspaceId: inv.workspaceId,
      userId,
      role: inv.role as "owner" | "admin" | "member",
    });

    if (inv.pendingSettings && Object.keys(inv.pendingSettings).length > 0) {
      // Валидация настроек перед сохранением
      const validatedSettings = this.validatePendingSettings(inv.pendingSettings as Record<string, unknown>);
      if (validatedSettings) {
        await this.userWorkspaceSettingsRepository.upsert(
          userId,
          inv.workspaceId,
          validatedSettings as Parameters<
            UserWorkspaceSettingsRepository["upsert"]
          >[2],
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
   * Revoke invitation by id - tries workspace_members first, then invitations table
   */
  async revoke(
    invitationId: string,
    workspaceId: string,
    _authUserId: string,
  ): Promise<boolean> {
    const removedMember = await this.workspacesService.removePendingMemberById(
      invitationId,
      workspaceId,
    );
    if (removedMember) return true;

    return this.invitationsRepository.revokeByIdAndWorkspace(
      invitationId,
      workspaceId,
    );
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

    const member = await this.workspacesService.getPendingMemberById(
      invitationId,
      workspaceId,
    );
    if (member) {
      return this.userWorkspaceSettingsRepository.upsert(
        member.userId,
        workspaceId,
        validatedSettings as Parameters<UserWorkspaceSettingsRepository["upsert"]>[2],
      );
    }

    const inv = await this.invitationsRepository.findByIdAndWorkspace(
      invitationId,
      workspaceId,
    );
    if (!inv) {
      throw new Error("Приглашение не найдено или уже принято");
    }
    return this.invitationsRepository.updatePendingSettings(
      invitationId,
      validatedSettings,
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
