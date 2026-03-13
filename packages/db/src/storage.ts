/**
 * Backend storage - PostgreSQL + Drizzle ORM
 * Data access layer for calls, users, prompts, evaluations
 */

import { compareSync, hashSync } from "bcryptjs";
import {
  and,
  avg,
  count,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  or,
} from "drizzle-orm";
import { db } from "./client";
import type { Call, CallEvaluation, Transcript, User } from "./schema";
import * as schema from "./schema";

export interface GetCallsParams {
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
  internalNumbers?: string[];
  mobileNumbers?: string[];
  direction?: string;
  valueScores?: number[];
  operators?: string[];
  manager?: string;
  status?: string;
  q?: string;
}

export interface CallWithTranscript {
  call: Call;
  transcript: Transcript | null;
  evaluation: CallEvaluation | null;
}

export interface UserUpdateData {
  filter_exclude_answering_machine?: boolean;
  filter_min_duration?: number;
  filter_min_replicas?: number;
  telegram_daily_report?: boolean;
  telegram_manager_report?: boolean;
  telegram_weekly_report?: boolean;
  telegram_monthly_report?: boolean;
  telegram_skip_weekends?: boolean;
  email_daily_report?: boolean;
  email_weekly_report?: boolean;
  email_monthly_report?: boolean;
  report_include_call_summaries?: boolean;
  report_detailed?: boolean;
  report_include_avg_value?: boolean;
  report_include_avg_rating?: boolean;
  report_managed_user_ids?: string | null;
  kpi_base_salary?: number;
  kpi_target_bonus?: number;
  kpi_target_talk_time_minutes?: number;
}

export const storage = {
  async getCall(id: number): Promise<Call | null> {
    const result = await db
      .select()
      .from(schema.calls)
      .where(eq(schema.calls.id, id))
      .limit(1);
    return result[0] ?? null;
  },

  async deleteCall(callId: number): Promise<boolean> {
    const result = await db
      .delete(schema.calls)
      .where(eq(schema.calls.id, callId));
    return (result.rowCount ?? 0) > 0;
  },

  async getTranscriptByCallId(callId: number): Promise<Transcript | null> {
    const result = await db
      .select()
      .from(schema.transcripts)
      .where(eq(schema.transcripts.call_id, callId))
      .limit(1);
    return result[0] ?? null;
  },

  async getEvaluation(callId: number): Promise<CallEvaluation | null> {
    const result = await db
      .select()
      .from(schema.callEvaluations)
      .where(eq(schema.callEvaluations.call_id, callId))
      .limit(1);
    return result[0] ?? null;
  },

  async getCallsWithTranscripts(
    params: GetCallsParams = {},
  ): Promise<CallWithTranscript[]> {
    const {
      limit = 100,
      offset = 0,
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      direction,
      valueScores,
      operators,
      manager,
      status,
      q,
    } = params;

    const conditions = [];

    if (dateFrom) {
      conditions.push(gte(schema.calls.timestamp, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(schema.calls.timestamp, dateTo));
    }
    if (internalNumbers?.length) {
      conditions.push(inArray(schema.calls.internal_number, internalNumbers));
    }
    if (mobileNumbers?.length) {
      conditions.push(inArray(schema.calls.number, mobileNumbers));
    }
    if (direction) {
      conditions.push(eq(schema.calls.direction, direction));
    }
    if (status) {
      conditions.push(eq(schema.calls.status, status));
    }
    if (operators?.length) {
      conditions.push(inArray(schema.calls.source, operators));
    }
    if (manager) {
      conditions.push(eq(schema.calls.name, manager));
    }
    if (valueScores?.length) {
      conditions.push(inArray(schema.callEvaluations.value_score, valueScores));
    }
    if (q) {
      const qCond = or(
        like(schema.calls.number, `%${q}%`),
        like(schema.calls.name, `%${q}%`),
        like(schema.calls.customer_name, `%${q}%`),
      );
      if (qCond) conditions.push(qCond);
    }

    let query = db
      .select({
        call: schema.calls,
        transcript: schema.transcripts,
        evaluation: schema.callEvaluations,
      })
      .from(schema.calls)
      .leftJoin(
        schema.transcripts,
        eq(schema.calls.id, schema.transcripts.call_id),
      )
      .leftJoin(
        schema.callEvaluations,
        eq(schema.calls.id, schema.callEvaluations.call_id),
      )
      .orderBy(desc(schema.calls.timestamp), desc(schema.calls.id))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const results = await query;

    return results.map((row) => ({
      call: row.call,
      transcript: row.transcript,
      evaluation: row.evaluation,
    }));
  },

  async countCalls(
    params: Omit<GetCallsParams, "limit" | "offset"> = {},
  ): Promise<number> {
    const {
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      direction,
      valueScores,
      operators,
      manager,
      status,
      q,
    } = params;

    const conditions = [];

    if (dateFrom) {
      conditions.push(gte(schema.calls.timestamp, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(schema.calls.timestamp, dateTo));
    }
    if (internalNumbers?.length) {
      conditions.push(inArray(schema.calls.internal_number, internalNumbers));
    }
    if (mobileNumbers?.length) {
      conditions.push(inArray(schema.calls.number, mobileNumbers));
    }
    if (direction) {
      conditions.push(eq(schema.calls.direction, direction));
    }
    if (status) {
      conditions.push(eq(schema.calls.status, status));
    }
    if (operators?.length) {
      conditions.push(inArray(schema.calls.source, operators));
    }
    if (manager) {
      conditions.push(eq(schema.calls.name, manager));
    }
    if (valueScores?.length) {
      conditions.push(inArray(schema.callEvaluations.value_score, valueScores));
    }
    if (q) {
      const qCond = or(
        like(schema.calls.number, `%${q}%`),
        like(schema.calls.name, `%${q}%`),
        like(schema.calls.customer_name, `%${q}%`),
      );
      if (qCond) conditions.push(qCond);
    }

    const baseQuery = valueScores?.length
      ? db
          .select({ count: count() })
          .from(schema.calls)
          .innerJoin(
            schema.callEvaluations,
            eq(schema.calls.id, schema.callEvaluations.call_id),
          )
      : db.select({ count: count() }).from(schema.calls);

    const result =
      conditions.length > 0
        ? await baseQuery.where(and(...conditions))
        : await baseQuery;
    return result[0]?.count ?? 0;
  },

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.username, username),
          eq(schema.users.is_active, true),
        ),
      )
      .limit(1);

    const user = result[0] ?? null;
    if (user && !user.first_name && user.name) {
      const parts = user.name.split(/\s+/, 2);
      (user as User).first_name = parts[0] ?? "";
      (user as User).last_name = parts[1] ?? "";
    }
    return user;
  },

  async verifyPassword(username: string, password: string): Promise<boolean> {
    const user = await storage.getUserByUsername(username);
    if (!user || !user.password_hash) return false;

    if (user.password_hash.startsWith("pbkdf2:sha256")) {
      return storage.verifyWerkzeugHash(password, user.password_hash);
    }
    return compareSync(password, user.password_hash);
  },

  async verifyWerkzeugHash(
    password: string,
    fullHash: string,
  ): Promise<boolean> {
    const { pbkdf2Sync } = await import("node:crypto");

    const parts = fullHash.split("$");
    if (parts.length < 4) return false;
    const [, method, saltB64, hashB64] = parts;
    if (method !== "pbkdf2:sha256" || !saltB64 || !hashB64) return false;

    const salt = Buffer.from(saltB64, "base64");
    const iterMatch = fullHash.match(/\$(\d+)\$/);
    const iterations = iterMatch?.[1] ? parseInt(iterMatch[1], 10) : 260000;
    const keylen = 32;
    const derived = pbkdf2Sync(password, salt, iterations, keylen, "sha256");
    const derivedB64 = derived.toString("base64").replace(/=/g, "");
    return derivedB64 === hashB64;
  },

  async getAllUsers(): Promise<User[]> {
    const results = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.is_active, true))
      .orderBy(desc(schema.users.created_at));

    return results.map((user) => {
      if (!user.first_name && user.name) {
        const parts = user.name.split(/\s+/, 2);
        (user as User).first_name = parts[0] ?? "";
        (user as User).last_name = parts[1] ?? "";
      }
      return user;
    });
  },

  async getUser(id: number): Promise<User | null> {
    const result = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, id), eq(schema.users.is_active, true)))
      .limit(1);

    const user = result[0] ?? null;
    if (user && !user.first_name && user.name) {
      const parts = user.name.split(/\s+/, 2);
      (user as User).first_name = parts[0] ?? "";
      (user as User).last_name = parts[1] ?? "";
    }
    return user;
  },

  async createUser(
    username: string,
    password: string,
    firstName: string,
    lastName = "",
    internalNumbers?: string | null,
    mobileNumbers?: string | null,
  ): Promise<number> {
    const passwordHash = hashSync(password, 10);
    const createdAt = new Date().toISOString();
    const fullName = lastName ? `${firstName} ${lastName}`.trim() : firstName;

    const result = await db
      .insert(schema.users)
      .values({
        username,
        password_hash: passwordHash,
        name: fullName,
        first_name: firstName,
        last_name: lastName,
        created_at: createdAt,
        is_active: true,
        internal_numbers: internalNumbers ?? null,
        mobile_numbers: mobileNumbers ?? null,
      })
      .returning({ id: schema.users.id });

    return result[0]?.id ?? 0;
  },

  async updateUserName(
    userId: number,
    firstName: string,
    lastName = "",
  ): Promise<boolean> {
    const fullName = lastName ? `${firstName} ${lastName}`.trim() : firstName;
    const result = await db
      .update(schema.users)
      .set({
        first_name: firstName,
        last_name: lastName,
        name: fullName,
      })
      .where(
        and(eq(schema.users.id, userId), eq(schema.users.is_active, true)),
      );

    return (result.rowCount ?? 0) > 0;
  },

  async updateUserInternalNumbers(
    userId: number,
    internalNumbers: string | null,
  ): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({ internal_numbers: internalNumbers })
      .where(
        and(eq(schema.users.id, userId), eq(schema.users.is_active, true)),
      );

    return (result.rowCount ?? 0) > 0;
  },

  async updateUserMobileNumbers(
    userId: number,
    mobileNumbers: string | null,
  ): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({ mobile_numbers: mobileNumbers })
      .where(
        and(eq(schema.users.id, userId), eq(schema.users.is_active, true)),
      );

    return (result.rowCount ?? 0) > 0;
  },

  async updateUserFilters(
    userId: number,
    filterExcludeAnsweringMachine: boolean,
    filterMinDuration: number,
    filterMinReplicas: number,
  ): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({
        filter_exclude_answering_machine: filterExcludeAnsweringMachine,
        filter_min_duration: filterMinDuration,
        filter_min_replicas: filterMinReplicas,
      })
      .where(
        and(eq(schema.users.id, userId), eq(schema.users.is_active, true)),
      );

    return (result.rowCount ?? 0) > 0;
  },

  async updateUserReportKpiSettings(
    userId: number,
    data: UserUpdateData,
  ): Promise<boolean> {
    const updates: Record<string, unknown> = {};
    if (data.report_include_call_summaries !== undefined)
      updates.report_include_call_summaries =
        data.report_include_call_summaries;
    if (data.report_detailed !== undefined)
      updates.report_detailed = data.report_detailed;
    if (data.report_include_avg_value !== undefined)
      updates.report_include_avg_value = data.report_include_avg_value;
    if (data.report_include_avg_rating !== undefined)
      updates.report_include_avg_rating = data.report_include_avg_rating;
    if (data.report_managed_user_ids !== undefined)
      updates.report_managed_user_ids = data.report_managed_user_ids;
    if (data.kpi_base_salary !== undefined)
      updates.kpi_base_salary = data.kpi_base_salary;
    if (data.kpi_target_bonus !== undefined)
      updates.kpi_target_bonus = data.kpi_target_bonus;
    if (data.kpi_target_talk_time_minutes !== undefined)
      updates.kpi_target_talk_time_minutes = data.kpi_target_talk_time_minutes;
    if (data.telegram_daily_report !== undefined)
      updates.telegram_daily_report = data.telegram_daily_report;
    if (data.telegram_manager_report !== undefined)
      updates.telegram_manager_report = data.telegram_manager_report;
    if (data.telegram_weekly_report !== undefined)
      updates.telegram_weekly_report = data.telegram_weekly_report;
    if (data.telegram_monthly_report !== undefined)
      updates.telegram_monthly_report = data.telegram_monthly_report;
    if (data.telegram_skip_weekends !== undefined)
      updates.telegram_skip_weekends = data.telegram_skip_weekends;
    if (data.email_daily_report !== undefined)
      updates.email_daily_report = data.email_daily_report;
    if (data.email_weekly_report !== undefined)
      updates.email_weekly_report = data.email_weekly_report;
    if (data.email_monthly_report !== undefined)
      updates.email_monthly_report = data.email_monthly_report;

    if (Object.keys(updates).length === 0) return true;

    const result = await db
      .update(schema.users)
      .set(updates as Record<string, unknown>)
      .where(
        and(eq(schema.users.id, userId), eq(schema.users.is_active, true)),
      );

    return (result.rowCount ?? 0) > 0;
  },

  async updateUserTelegramSettings(
    userId: number,
    _telegramChatId: string | null,
    telegramDailyReport: boolean,
    telegramManagerReport: boolean,
  ): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({
        telegram_daily_report: telegramDailyReport,
        telegram_manager_report: telegramManagerReport,
      })
      .where(
        and(eq(schema.users.id, userId), eq(schema.users.is_active, true)),
      );

    return (result.rowCount ?? 0) > 0;
  },

  async updateUserPassword(
    userId: number,
    newPassword: string,
  ): Promise<boolean> {
    const passwordHash = hashSync(newPassword, 10);
    const result = await db
      .update(schema.users)
      .set({ password_hash: passwordHash })
      .where(
        and(eq(schema.users.id, userId), eq(schema.users.is_active, true)),
      );

    return (result.rowCount ?? 0) > 0;
  },

  async deleteUser(userId: number): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({ is_active: false })
      .where(eq(schema.users.id, userId));

    return (result.rowCount ?? 0) > 0;
  },

  async saveTelegramConnectToken(
    userId: number,
    token: string,
  ): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({ telegram_connect_token: token })
      .where(eq(schema.users.id, userId));

    return (result.rowCount ?? 0) > 0;
  },

  async getUserByTelegramConnectToken(token: string): Promise<User | null> {
    const result = await db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.telegram_connect_token, token),
          eq(schema.users.is_active, true),
        ),
      )
      .limit(1);

    const user = result[0] ?? null;
    if (!user) return null;

    // Безопасно создаем обновленный объект пользователя с заполненными полями
    const updatedUser: User = {
      ...user,
      first_name: user.first_name || (user.name ? user.name.split(/\s+/, 2)[0] || "" : ""),
      last_name: user.last_name || (user.name ? user.name.split(/\s+/, 2)[1] || "" : ""),
    };

    return updatedUser;
  },

  async saveTelegramChatId(userId: number, chatId: string): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({
        telegram_chat_id: chatId,
        telegram_connect_token: null,
      })
      .where(eq(schema.users.id, userId));

    return (result.rowCount ?? 0) > 0;
  },

  async saveMaxConnectToken(userId: number, token: string): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({ max_connect_token: token })
      .where(eq(schema.users.id, userId));

    return (result.rowCount ?? 0) > 0;
  },

  async disconnectTelegram(userId: number): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({
        telegram_chat_id: null,
        telegram_daily_report: false,
        telegram_manager_report: false,
      })
      .where(eq(schema.users.id, userId));

    return (result.rowCount ?? 0) > 0;
  },

  async disconnectMax(userId: number): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({
        max_chat_id: null,
        max_daily_report: false,
        max_manager_report: false,
      })
      .where(eq(schema.users.id, userId));

    return (result.rowCount ?? 0) > 0;
  },

  async getPrompt(key: string, defaultValue?: string): Promise<string | null> {
    const result = await db
      .select()
      .from(schema.prompts)
      .where(eq(schema.prompts.key, key))
      .limit(1);

    return result[0]?.value ?? defaultValue ?? null;
  },

  async getAllPrompts(): Promise<
    {
      key: string;
      value: string;
      description: string | null;
      updated_at: string | null;
    }[]
  > {
    return await db
      .select({
        key: schema.prompts.key,
        value: schema.prompts.value,
        description: schema.prompts.description,
        updated_at: schema.prompts.updated_at,
      })
      .from(schema.prompts)
      .orderBy(schema.prompts.key);
  },

  async updatePrompt(
    key: string,
    value: string,
    description?: string | null,
  ): Promise<boolean> {
    const now = new Date().toISOString();

    const existing = await db
      .select()
      .from(schema.prompts)
      .where(eq(schema.prompts.key, key))
      .limit(1);

    if (existing[0]) {
      const result = await db
        .update(schema.prompts)
        .set({
          value,
          description: description ?? existing[0].description,
          updated_at: now,
        })
        .where(eq(schema.prompts.key, key));

      return (result.rowCount ?? 0) > 0;
    }

    await db.insert(schema.prompts).values({
      key,
      value,
      description: description ?? "",
      updated_at: now,
    });
    return true;
  },

  async addActivityLog(
    level: string,
    message: string,
    actor: string,
  ): Promise<void> {
    await db.insert(schema.activityLog).values({
      timestamp: new Date().toISOString(),
      level,
      message,
      actor,
    });
  },

  async addEvaluation(data: {
    call_id: number;
    value_score?: number | null;
    value_explanation?: string | null;
    manager_score?: number | null;
    manager_feedback?: string | null;
    manager_breakdown?: Record<string, unknown> | string | null;
    manager_recommendations?: string[] | null;
    is_quality_analyzable?: boolean;
    not_analyzable_reason?: string | null;
  }): Promise<number> {
    const breakdown =
      typeof data.manager_breakdown === "object"
        ? JSON.stringify(data.manager_breakdown)
        : (data.manager_breakdown ?? null);
    const recommendations = Array.isArray(data.manager_recommendations)
      ? JSON.stringify(data.manager_recommendations)
      : null;

    const result = await db
      .insert(schema.callEvaluations)
      .values({
        call_id: data.call_id,
        is_quality_analyzable: data.is_quality_analyzable !== false,
        not_analyzable_reason: data.not_analyzable_reason ?? null,
        value_score: data.value_score ?? null,
        value_explanation: data.value_explanation ?? null,
        manager_score: data.manager_score ?? null,
        manager_feedback: data.manager_feedback ?? null,
        manager_breakdown: breakdown,
        manager_recommendations: recommendations,
        created_at: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: schema.callEvaluations.call_id,
        set: {
          is_quality_analyzable: data.is_quality_analyzable !== false,
          not_analyzable_reason: data.not_analyzable_reason ?? null,
          value_score: data.value_score ?? null,
          value_explanation: data.value_explanation ?? null,
          manager_score: data.manager_score ?? null,
          manager_feedback: data.manager_feedback ?? null,
          manager_breakdown: breakdown,
          manager_recommendations: recommendations,
          created_at: new Date().toISOString(),
        },
      })
      .returning({ id: schema.callEvaluations.id });

    return result[0]?.id ?? 0;
  },

  async calculateMetrics(): Promise<{
    total_calls: number;
    transcribed: number;
    avg_duration: number;
    last_sync: string | null;
  }> {
    const [
      totalCallsResult,
      transcribedResult,
      avgDurationResult,
      lastSyncResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(schema.calls),
      db.select({ count: count() }).from(schema.transcripts),
      db.select({ avg: avg(schema.calls.duration) }).from(schema.calls),
      db
        .select({ timestamp: schema.activityLog.timestamp })
        .from(schema.activityLog)
        .orderBy(desc(schema.activityLog.timestamp))
        .limit(1),
    ]);

    const totalCalls = totalCallsResult[0]?.count ?? 0;
    const transcribed = transcribedResult[0]?.count ?? 0;
    const avgDuration = Math.round(Number(avgDurationResult[0]?.avg ?? 0));
    const lastSync = lastSyncResult[0]?.timestamp ?? null;

    return {
      total_calls: totalCalls,
      transcribed,
      avg_duration: avgDuration,
      last_sync: lastSync,
    };
  },

  async getEvaluationsStats(params: {
    dateFrom?: string;
    dateTo?: string;
    internalNumbers?: string[];
  }): Promise<
    Record<
      string,
      {
        name: string;
        internal_number: string | null;
        incoming: { count: number; duration: number };
        outgoing: { count: number; duration: number };
        score_distribution?: Record<
          number,
          { count: number; duration: number }
        >;
      }
    >
  > {
    const { dateFrom, dateTo, internalNumbers } = params;

    const conditions = [];
    if (dateFrom) conditions.push(gte(schema.calls.timestamp, dateFrom));
    if (dateTo) conditions.push(lte(schema.calls.timestamp, dateTo));
    if (internalNumbers?.length) {
      conditions.push(inArray(schema.calls.internal_number, internalNumbers));
    }

    let query = db
      .select({
        internal_number: schema.calls.internal_number,
        manager_name: schema.calls.name,
        direction: schema.calls.direction,
        total_calls: count(),
        total_duration: avg(schema.calls.duration),
      })
      .from(schema.calls)
      .leftJoin(
        schema.callEvaluations,
        eq(schema.calls.id, schema.callEvaluations.call_id),
      )
      .groupBy(
        schema.calls.internal_number,
        schema.calls.name,
        schema.calls.direction,
      );

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const results = await query;
    const stats: Record<
      string,
      {
        name: string;
        internal_number: string | null;
        incoming: { count: number; duration: number };
        outgoing: { count: number; duration: number };
      }
    > = {};

    for (const row of results) {
      const key = row.manager_name ?? row.internal_number ?? "Unknown";
      if (!stats[key]) {
        stats[key] = {
          name: key,
          internal_number: row.internal_number,
          incoming: { count: 0, duration: 0 },
          outgoing: { count: 0, duration: 0 },
        };
      }

      const dir = String(row.direction ?? "").toLowerCase();
      const target =
        dir === "входящий" || dir === "incoming"
          ? stats[key].incoming
          : stats[key].outgoing;

      target.count += Number(row.total_calls ?? 0);
      target.duration += Number(row.total_duration ?? 0);
    }

    return stats;
  },
};
