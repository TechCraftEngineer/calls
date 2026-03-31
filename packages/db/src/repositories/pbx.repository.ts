import { and, eq, inArray, isNull, or } from "drizzle-orm";
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

  async upsertLink(input: {
    workspaceId: string;
    provider: string;
    targetType: "employee" | "number";
    targetExternalId: string;
    userId?: string | null;
    invitationId?: string | null;
    linkSource?: string;
    confidence?: number;
    linkedByUserId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const now = new Date();
    const result = await db
      .insert(schema.workspacePbxLinks)
      .values({
        workspaceId: input.workspaceId,
        provider: input.provider,
        targetType: input.targetType,
        targetExternalId: input.targetExternalId,
        userId: input.userId ?? null,
        invitationId: input.invitationId ?? null,
        linkSource: input.linkSource ?? "manual",
        confidence: input.confidence ?? 100,
        linkedByUserId: input.linkedByUserId ?? null,
        metadata: input.metadata ?? null,
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
          userId: input.userId ?? null,
          invitationId: input.invitationId ?? null,
          linkSource: input.linkSource ?? "manual",
          confidence: input.confidence ?? 100,
          linkedByUserId: input.linkedByUserId ?? null,
          metadata: input.metadata ?? null,
          updatedAt: now,
        },
      })
      .returning();
    return result[0] ?? null;
  },

  async deleteLink(
    workspaceId: string,
    provider: string,
    targetType: "employee" | "number",
    targetExternalId: string,
  ) {
    const result = await db
      .delete(schema.workspacePbxLinks)
      .where(
        and(
          eq(schema.workspacePbxLinks.workspaceId, workspaceId),
          eq(schema.workspacePbxLinks.provider, provider),
          eq(schema.workspacePbxLinks.targetType, targetType),
          eq(schema.workspacePbxLinks.targetExternalId, targetExternalId),
        ),
      );
    return (result.rowCount ?? 0) > 0;
  },

  async listLinks(workspaceId: string, provider: string) {
    return db
      .select({
        link: schema.workspacePbxLinks,
        user: schema.user,
        invitation: schema.invitations,
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
        ),
      );
  },

  async findCandidateUsers(workspaceId: string, extensions: string[], emails: string[]) {
    const cleanExtensions = [...new Set(extensions.map((item) => item.trim()).filter(Boolean))];
    const cleanEmails = [
      ...new Set(emails.map((item) => item.trim().toLowerCase()).filter(Boolean)),
    ];

    const members = await db
      .select({ memberId: schema.workspaceMembers.id, user: schema.user })
      .from(schema.workspaceMembers)
      .innerJoin(schema.user, eq(schema.workspaceMembers.userId, schema.user.id))
      .where(eq(schema.workspaceMembers.workspaceId, workspaceId));

    return members
      .filter(({ user }) => {
        const userExtensions = (user.internalExtensions ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        const matchesExtension =
          cleanExtensions.length > 0 &&
          userExtensions.some((item) => cleanExtensions.includes(item));
        const matchesEmail =
          cleanEmails.length > 0 &&
          Boolean(user.email) &&
          cleanEmails.includes(user.email.toLowerCase());
        return matchesExtension || matchesEmail;
      })
      .map(({ user, memberId }) => ({
        id: user.id,
        memberId,
        email: user.email,
        name: user.name,
        givenName: user.givenName,
        familyName: user.familyName,
        internalExtensions: user.internalExtensions,
      }));
  },

  async findCandidateInvitations(workspaceId: string, emails: string[]) {
    const cleanEmails = [
      ...new Set(emails.map((item) => item.trim().toLowerCase()).filter(Boolean)),
    ];
    if (cleanEmails.length === 0) return [];

    return db
      .select()
      .from(schema.invitations)
      .where(
        and(
          eq(schema.invitations.workspaceId, workspaceId),
          inArray(schema.invitations.email, cleanEmails),
          isNull(schema.invitations.acceptedAt),
        ),
      );
  },

  async getLinkMap(
    workspaceId: string,
    provider: string,
    targetType: "employee" | "number",
  ): Promise<Map<string, schema.WorkspacePbxLink>> {
    const rows = await db
      .select()
      .from(schema.workspacePbxLinks)
      .where(
        and(
          eq(schema.workspacePbxLinks.workspaceId, workspaceId),
          eq(schema.workspacePbxLinks.provider, provider),
          eq(schema.workspacePbxLinks.targetType, targetType),
        ),
      );
    return new Map(rows.map((row) => [row.targetExternalId, row]));
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

  async getLinkedWorkspaceUsers(workspaceId: string, provider: string) {
    return db
      .select({ link: schema.workspacePbxLinks, user: schema.user })
      .from(schema.workspacePbxLinks)
      .leftJoin(schema.user, eq(schema.workspacePbxLinks.userId, schema.user.id))
      .where(
        and(
          eq(schema.workspacePbxLinks.workspaceId, workspaceId),
          eq(schema.workspacePbxLinks.provider, provider),
          or(
            eq(schema.workspacePbxLinks.targetType, "employee"),
            eq(schema.workspacePbxLinks.targetType, "number"),
          ),
        ),
      );
  },
};

export type PbxRepository = typeof pbxRepository;
