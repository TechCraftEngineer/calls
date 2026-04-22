import { and, eq } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";

type PbxEmployeeUpsert = {
  workspaceId: string;
  provider: string;
  externalId: string;
  extension?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName: string;
  isActive?: boolean;
  rawData: Record<string, unknown>;
};

type PbxNumberUpsert = {
  workspaceId: string;
  provider: string;
  externalId: string;
  employeeExternalId?: string | null;
  phoneNumber: string;
  extension?: string | null;
  label?: string | null;
  lineType?: string | null;
  isActive?: boolean;
  rawData: Record<string, unknown>;
};

export const pbxRepository = {
  async upsertEmployees(items: PbxEmployeeUpsert[]): Promise<void> {
    if (items.length === 0) return;
    const now = new Date();
    for (const item of items) {
      await db
        .insert(schema.workspacePbxEmployees)
        .values({
          workspaceId: item.workspaceId,
          provider: item.provider,
          externalId: item.externalId,
          extension: item.extension ?? null,
          email: item.email ?? null,
          firstName: item.firstName ?? null,
          lastName: item.lastName ?? null,
          displayName: item.displayName,
          isActive: item.isActive ?? true,
          rawData: item.rawData,
          syncedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            schema.workspacePbxEmployees.workspaceId,
            schema.workspacePbxEmployees.provider,
            schema.workspacePbxEmployees.externalId,
          ],
          set: {
            extension: item.extension ?? null,
            email: item.email ?? null,
            firstName: item.firstName ?? null,
            lastName: item.lastName ?? null,
            displayName: item.displayName,
            isActive: item.isActive ?? true,
            rawData: item.rawData,
            syncedAt: now,
            updatedAt: now,
          },
        });
    }
  },

  async upsertNumbers(items: PbxNumberUpsert[]): Promise<void> {
    if (items.length === 0) return;
    const now = new Date();
    for (const item of items) {
      await db
        .insert(schema.workspacePbxNumbers)
        .values({
          workspaceId: item.workspaceId,
          provider: item.provider,
          externalId: item.externalId,
          employeeExternalId: item.employeeExternalId ?? null,
          phoneNumber: item.phoneNumber,
          extension: item.extension ?? null,
          label: item.label ?? null,
          lineType: item.lineType ?? null,
          isActive: item.isActive ?? true,
          rawData: item.rawData,
          syncedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            schema.workspacePbxNumbers.workspaceId,
            schema.workspacePbxNumbers.provider,
            schema.workspacePbxNumbers.externalId,
          ],
          set: {
            employeeExternalId: item.employeeExternalId ?? null,
            phoneNumber: item.phoneNumber,
            extension: item.extension ?? null,
            label: item.label ?? null,
            lineType: item.lineType ?? null,
            isActive: item.isActive ?? true,
            rawData: item.rawData,
            syncedAt: now,
            updatedAt: now,
          },
        });
    }
  },

  async listEmployees(workspaceId: string, provider: string) {
    return db
      .select()
      .from(schema.workspacePbxEmployees)
      .where(
        and(
          eq(schema.workspacePbxEmployees.workspaceId, workspaceId),
          eq(schema.workspacePbxEmployees.provider, provider),
        ),
      );
  },

  async listEmployeeLinks(workspaceId: string, provider: string) {
    return db
      .select({
        id: schema.workspacePbxLinks.id,
        targetExternalId: schema.workspacePbxLinks.targetExternalId,
        user: {
          id: schema.user.id,
          email: schema.user.email,
          name: schema.user.name,
        },
        invitation: {
          id: schema.invitations.id,
          email: schema.invitations.email,
          role: schema.invitations.role,
        },
      })
      .from(schema.workspacePbxLinks)
      .leftJoin(schema.user, eq(schema.workspacePbxLinks.userId, schema.user.id))
      .leftJoin(
        schema.invitations,
        eq(schema.workspacePbxLinks.invitationId, schema.invitations.id),
      )
      .where(
        and(
          eq(schema.workspacePbxLinks.workspaceId, workspaceId),
          eq(schema.workspacePbxLinks.provider, provider),
          eq(schema.workspacePbxLinks.targetType, "employee"),
        ),
      );
  },

  async updateEmployeeKpiSettings(input: {
    workspaceId: string;
    provider: string;
    externalId: string;
    kpiBaseSalary: number;
    kpiTargetBonus: number;
    kpiTargetTalkTimeMinutes: number;
  }) {
    const rows = await db
      .update(schema.workspacePbxEmployees)
      .set({
        kpiBaseSalary: input.kpiBaseSalary,
        kpiTargetBonus: input.kpiTargetBonus,
        kpiTargetTalkTimeMinutes: input.kpiTargetTalkTimeMinutes,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.workspacePbxEmployees.workspaceId, input.workspaceId),
          eq(schema.workspacePbxEmployees.provider, input.provider),
          eq(schema.workspacePbxEmployees.externalId, input.externalId),
        ),
      )
      .returning();
    return rows[0] ?? null;
  },

  async listNumbers(workspaceId: string, provider: string) {
    return db
      .select()
      .from(schema.workspacePbxNumbers)
      .where(
        and(
          eq(schema.workspacePbxNumbers.workspaceId, workspaceId),
          eq(schema.workspacePbxNumbers.provider, provider),
        ),
      );
  },

  async getEmployeeMap(
    workspaceId: string,
    provider: string,
  ): Promise<Map<string, schema.WorkspacePbxEmployee>> {
    const rows = await this.listEmployees(workspaceId, provider);
    return new Map(rows.map((row) => [row.externalId, row]));
  },

  async getNumberMap(
    workspaceId: string,
    provider: string,
  ): Promise<Map<string, schema.WorkspacePbxNumber>> {
    const rows = await this.listNumbers(workspaceId, provider);
    return new Map(rows.map((row) => [row.externalId, row]));
  },

  async updateSyncState(input: {
    workspaceId: string;
    provider: string;
    syncType: string;
    status: "idle" | "running" | "success" | "error";
    cursor?: string | null;
    lastError?: string | null;
    stats?: Record<string, unknown> | null;
    markStarted?: boolean;
    markCompleted?: boolean;
    markSuccessful?: boolean;
  }) {
    const now = new Date();
    await db
      .insert(schema.workspacePbxSyncState)
      .values({
        workspaceId: input.workspaceId,
        provider: input.provider,
        syncType: input.syncType,
        status: input.status,
        cursor: input.cursor ?? null,
        lastError: input.lastError ?? null,
        stats: input.stats ?? null,
        lastStartedAt: input.markStarted ? now : null,
        lastCompletedAt: input.markCompleted ? now : null,
        lastSuccessfulAt: input.markSuccessful ? now : null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          schema.workspacePbxSyncState.workspaceId,
          schema.workspacePbxSyncState.provider,
          schema.workspacePbxSyncState.syncType,
        ],
        set: {
          status: input.status,
          cursor: input.cursor ?? null,
          lastError: input.lastError ?? null,
          stats: input.stats ?? null,
          updatedAt: now,
          ...(input.markStarted ? { lastStartedAt: now } : {}),
          ...(input.markCompleted ? { lastCompletedAt: now } : {}),
          ...(input.markSuccessful ? { lastSuccessfulAt: now } : {}),
        },
      });
  },

  async listSyncStates(workspaceId: string, provider: string) {
    return db
      .select()
      .from(schema.workspacePbxSyncState)
      .where(
        and(
          eq(schema.workspacePbxSyncState.workspaceId, workspaceId),
          eq(schema.workspacePbxSyncState.provider, provider),
        ),
      );
  },

  async getSyncState(workspaceId: string, provider: string, syncType: string) {
    const rows = await db
      .select()
      .from(schema.workspacePbxSyncState)
      .where(
        and(
          eq(schema.workspacePbxSyncState.workspaceId, workspaceId),
          eq(schema.workspacePbxSyncState.provider, provider),
          eq(schema.workspacePbxSyncState.syncType, syncType),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async insertWebhookEvent(input: {
    workspaceId: string;
    provider: string;
    eventId?: string | null;
    eventType: string;
    payload: Record<string, unknown>;
    status?: string;
    errorMessage?: string | null;
    processedAt?: Date | null;
  }) {
    const rows = await db
      .insert(schema.workspacePbxWebhookEvents)
      .values({
        workspaceId: input.workspaceId,
        provider: input.provider,
        eventId: input.eventId ?? null,
        eventType: input.eventType,
        payload: input.payload,
        status: input.status ?? "received",
        errorMessage: input.errorMessage ?? null,
        processedAt: input.processedAt ?? null,
      })
      .onConflictDoUpdate({
        target: [
          schema.workspacePbxWebhookEvents.workspaceId,
          schema.workspacePbxWebhookEvents.provider,
          schema.workspacePbxWebhookEvents.eventId,
        ],
        set: {
          payload: input.payload,
          status: input.status ?? "received",
          errorMessage: input.errorMessage ?? null,
          processedAt: input.processedAt ?? null,
        },
      })
      .returning();
    return rows[0] ?? null;
  },

  async listWebhookEvents(workspaceId: string, provider: string) {
    return db
      .select()
      .from(schema.workspacePbxWebhookEvents)
      .where(
        and(
          eq(schema.workspacePbxWebhookEvents.workspaceId, workspaceId),
          eq(schema.workspacePbxWebhookEvents.provider, provider),
        ),
      );
  },

  async getLinkByUserId(
    workspaceId: string,
    provider: string,
    userId: string,
  ): Promise<schema.WorkspacePbxLink | null> {
    const rows = await db
      .select()
      .from(schema.workspacePbxLinks)
      .where(
        and(
          eq(schema.workspacePbxLinks.workspaceId, workspaceId),
          eq(schema.workspacePbxLinks.provider, provider),
          eq(schema.workspacePbxLinks.userId, userId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async upsertEmployeeLink(input: {
    workspaceId: string;
    provider: string;
    employeeExternalId: string;
    userId: string | null;
    invitationId: string | null;
    linkedByUserId?: string;
  }) {
    const now = new Date();
    const rows = await db
      .insert(schema.workspacePbxLinks)
      .values({
        workspaceId: input.workspaceId,
        provider: input.provider,
        targetType: "employee",
        targetExternalId: input.employeeExternalId,
        userId: input.userId,
        invitationId: input.invitationId,
        linkSource: "manual",
        linkedByUserId: input.linkedByUserId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          schema.workspacePbxLinks.workspaceId,
          schema.workspacePbxLinks.provider,
          schema.workspacePbxLinks.targetType,
          schema.workspacePbxLinks.targetExternalId,
        ],
        set: {
          userId: input.userId,
          invitationId: input.invitationId,
          linkedByUserId: input.linkedByUserId,
          updatedAt: now,
        },
      })
      .returning();
    return rows[0];
  },

  async deleteEmployeeLink(workspaceId: string, provider: string, employeeExternalId: string) {
    await db
      .delete(schema.workspacePbxLinks)
      .where(
        and(
          eq(schema.workspacePbxLinks.workspaceId, workspaceId),
          eq(schema.workspacePbxLinks.provider, provider),
          eq(schema.workspacePbxLinks.targetType, "employee"),
          eq(schema.workspacePbxLinks.targetExternalId, employeeExternalId),
        ),
      );
  },

  async getEmployeeReportSettings(employeeId: string) {
    const rows = await db
      .select()
      .from(schema.workspacePbxEmployeeReportSettings)
      .where(eq(schema.workspacePbxEmployeeReportSettings.employeeId, employeeId))
      .limit(1);
    return rows[0] ?? null;
  },

  async upsertEmployeeReportSettings(input: {
    employeeId: string;
    workspaceId: string;
    email: string | null;
    dailyReport: boolean;
    weeklyReport: boolean;
    monthlyReport: boolean;
    skipWeekends: boolean;
  }) {
    // Verify that the employee belongs to the specified workspace
    const employee = await db
      .select({ workspaceId: schema.workspacePbxEmployees.workspaceId })
      .from(schema.workspacePbxEmployees)
      .where(eq(schema.workspacePbxEmployees.id, input.employeeId))
      .limit(1);

    if (!employee[0]) {
      throw new Error("Employee not found");
    }

    if (employee[0].workspaceId !== input.workspaceId) {
      throw new Error("Employee does not belong to the specified workspace");
    }

    const now = new Date();
    const rows = await db
      .insert(schema.workspacePbxEmployeeReportSettings)
      .values({
        employeeId: input.employeeId,
        workspaceId: input.workspaceId,
        email: input.email,
        dailyReport: input.dailyReport,
        weeklyReport: input.weeklyReport,
        monthlyReport: input.monthlyReport,
        skipWeekends: input.skipWeekends,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.workspacePbxEmployeeReportSettings.employeeId,
        set: {
          email: input.email,
          dailyReport: input.dailyReport,
          weeklyReport: input.weeklyReport,
          monthlyReport: input.monthlyReport,
          skipWeekends: input.skipWeekends,
          updatedAt: now,
        },
      })
      .returning();
    return rows[0];
  },

  async listEmployeeReportSettingsWithEmployees(workspaceId: string, provider: string) {
    return db
      .select({
        employee: schema.workspacePbxEmployees,
        settings: schema.workspacePbxEmployeeReportSettings,
      })
      .from(schema.workspacePbxEmployees)
      .leftJoin(
        schema.workspacePbxEmployeeReportSettings,
        eq(schema.workspacePbxEmployees.id, schema.workspacePbxEmployeeReportSettings.employeeId),
      )
      .where(
        and(
          eq(schema.workspacePbxEmployees.workspaceId, workspaceId),
          eq(schema.workspacePbxEmployees.provider, provider),
        ),
      );
  },

  async listEmployeesWithActiveReports(
    workspaceId: string,
    provider: string,
    reportType: "daily" | "weekly" | "monthly",
  ) {
    const reportField =
      reportType === "daily"
        ? schema.workspacePbxEmployeeReportSettings.dailyReport
        : reportType === "weekly"
          ? schema.workspacePbxEmployeeReportSettings.weeklyReport
          : schema.workspacePbxEmployeeReportSettings.monthlyReport;

    return db
      .select({
        employee: schema.workspacePbxEmployees,
        settings: schema.workspacePbxEmployeeReportSettings,
      })
      .from(schema.workspacePbxEmployees)
      .innerJoin(
        schema.workspacePbxEmployeeReportSettings,
        eq(schema.workspacePbxEmployees.id, schema.workspacePbxEmployeeReportSettings.employeeId),
      )
      .where(
        and(
          eq(schema.workspacePbxEmployees.workspaceId, workspaceId),
          eq(schema.workspacePbxEmployees.provider, provider),
          eq(schema.workspacePbxEmployees.isActive, true),
          eq(reportField, true),
        ),
      );
  },
};

export type PbxRepository = typeof pbxRepository;
