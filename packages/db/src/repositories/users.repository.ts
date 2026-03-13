/**
 * Users repository - handles all database operations for users
 */

import { and, eq, desc } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";
import { BaseRepository } from "./base.repository";
import type { CreateUserData, UpdateUserData, UserUpdateData } from "../types/users.types";

export class UsersRepository extends BaseRepository<typeof schema.users> {
  constructor() {
    super(schema.users);
  }

  async findByUsername(username: string): Promise<any | null> {
    const result = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.username, username), eq(schema.users.is_active, true)))
      .limit(1);
    
    const user = result[0] ?? null;
    if (user && !user.givenName && user.name) {
      const parts = user.name.split(/\s+/, 2);
      user.givenName = parts[0] ?? "";
      user.familyName = parts[1] ?? "";
    }
    return user;
  }

  async findWithAllData(username: string): Promise<any | null> {
    const result = await db
      .select({
        user: schema.users,
        integrations: schema.userIntegrations,
        filters: schema.userFilters,
        reportSettings: schema.userReportSettings,
        kpiSettings: schema.userKpiSettings,
      })
      .from(schema.users)
      .leftJoin(
        schema.userIntegrations,
        eq(schema.users.id, schema.userIntegrations.user_id)
      )
      .leftJoin(
        schema.userFilters,
        eq(schema.users.id, schema.userFilters.user_id)
      )
      .leftJoin(
        schema.userReportSettings,
        eq(schema.users.id, schema.userReportSettings.user_id)
      )
      .leftJoin(
        schema.userKpiSettings,
        eq(schema.users.id, schema.userKpiSettings.user_id)
      )
      .where(
        and(
          eq(schema.users.username, username),
          eq(schema.users.is_active, true),
        ),
      )
      .limit(1);

    const row = result[0] ?? null;
    if (!row) return null;

    // Combine all data into single user object
    const user: any = {
      ...row.user,
      // Add integration fields
      telegram_chat_id: row.integrations?.telegram_chat_id,
      telegram_connect_token: row.integrations?.telegram_connect_token,
      telegram_daily_report: row.integrations?.telegram_daily_report ?? false,
      telegram_manager_report: row.integrations?.telegram_manager_report ?? false,
      telegram_weekly_report: row.integrations?.telegram_weekly_report ?? false,
      telegram_monthly_report: row.integrations?.telegram_monthly_report ?? false,
      telegram_skip_weekends: row.integrations?.telegram_skip_weekends ?? false,
      max_chat_id: row.integrations?.max_chat_id,
      max_connect_token: row.integrations?.max_connect_token,
      max_daily_report: row.integrations?.max_daily_report ?? false,
      max_manager_report: row.integrations?.max_manager_report ?? false,
      email_daily_report: row.integrations?.email_daily_report ?? false,
      email_weekly_report: row.integrations?.email_weekly_report ?? false,
      email_monthly_report: row.integrations?.email_monthly_report ?? false,
      // Add filter fields
      filter_exclude_answering_machine: row.filters?.filter_exclude_answering_machine ?? false,
      filter_min_duration: row.filters?.filter_min_duration ?? 0,
      filter_min_replicas: row.filters?.filter_min_replicas ?? 0,
      // Add report settings
      report_include_call_summaries: row.reportSettings?.report_include_call_summaries ?? false,
      report_detailed: row.reportSettings?.report_detailed ?? false,
      report_include_avg_value: row.reportSettings?.report_include_avg_value ?? false,
      report_include_avg_rating: row.reportSettings?.report_include_avg_rating ?? false,
      report_managed_user_ids: row.reportSettings?.report_managed_user_ids,
      // Add KPI settings
      kpi_base_salary: row.kpiSettings?.kpi_base_salary ?? 0,
      kpi_target_bonus: row.kpiSettings?.kpi_target_bonus ?? 0,
      kpi_target_talk_time_minutes: row.kpiSettings?.kpi_target_talk_time_minutes ?? 0,
    };

    if (!user.givenName && user.name) {
      const parts = user.name.split(/\s+/, 2);
      user.givenName = parts[0] ?? "";
      user.familyName = parts[1] ?? "";
    }
    return user;
  }

  async findAllActive(): Promise<any[]> {
    try {
      const results = await db
        .select({
          user: schema.users,
          integrations: schema.userIntegrations,
          filters: schema.userFilters,
          reportSettings: schema.userReportSettings,
          kpiSettings: schema.userKpiSettings,
        })
        .from(schema.users)
        .leftJoin(
          schema.userIntegrations,
          eq(schema.users.id, schema.userIntegrations.user_id)
        )
        .leftJoin(
          schema.userFilters,
          eq(schema.users.id, schema.userFilters.user_id)
        )
        .leftJoin(
          schema.userReportSettings,
          eq(schema.users.id, schema.userReportSettings.user_id)
        )
        .leftJoin(
          schema.userKpiSettings,
          eq(schema.users.id, schema.userKpiSettings.user_id)
        )
        .where(eq(schema.users.is_active, true))
        .orderBy(desc(schema.users.created_at));

      return results.map((row) => {
        const user: any = {
          ...row.user,
          // Add integration fields
          telegram_chat_id: row.integrations?.telegram_chat_id,
          telegram_connect_token: row.integrations?.telegram_connect_token,
          telegram_daily_report: row.integrations?.telegram_daily_report ?? false,
          telegram_manager_report: row.integrations?.telegram_manager_report ?? false,
          telegram_weekly_report: row.integrations?.telegram_weekly_report ?? false,
          telegram_monthly_report: row.integrations?.telegram_monthly_report ?? false,
          telegram_skip_weekends: row.integrations?.telegram_skip_weekends ?? false,
          max_chat_id: row.integrations?.max_chat_id,
          max_connect_token: row.integrations?.max_connect_token,
          max_daily_report: row.integrations?.max_daily_report ?? false,
          max_manager_report: row.integrations?.max_manager_report ?? false,
          email_daily_report: row.integrations?.email_daily_report ?? false,
          email_weekly_report: row.integrations?.email_weekly_report ?? false,
          email_monthly_report: row.integrations?.email_monthly_report ?? false,
          // Add filter fields
          filter_exclude_answering_machine: row.filters?.filter_exclude_answering_machine ?? false,
          filter_min_duration: row.filters?.filter_min_duration ?? 0,
          filter_min_replicas: row.filters?.filter_min_replicas ?? 0,
          // Add report settings
          report_include_call_summaries: row.reportSettings?.report_include_call_summaries ?? false,
          report_detailed: row.reportSettings?.report_detailed ?? false,
          report_include_avg_value: row.reportSettings?.report_include_avg_value ?? false,
          report_include_avg_rating: row.reportSettings?.report_include_avg_rating ?? false,
          report_managed_user_ids: row.reportSettings?.report_managed_user_ids,
          // Add KPI settings
          kpi_base_salary: row.kpiSettings?.kpi_base_salary ?? 0,
          kpi_target_bonus: row.kpiSettings?.kpi_target_bonus ?? 0,
          kpi_target_talk_time_minutes: row.kpiSettings?.kpi_target_talk_time_minutes ?? 0,
        };

        if (!user.givenName && user.name) {
          const parts = user.name.split(/\s+/, 2);
          user.givenName = parts[0] ?? "";
          user.familyName = parts[1] ?? "";
        }
        return user;
      });
    } catch (error) {
      console.error("[UsersRepository] Error in findAllActive:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error("Failed to fetch users from database");
    }
  }

  async create(data: CreateUserData): Promise<number> {
    const { hashSync } = await import("bcryptjs");
    const passwordHash = hashSync(data.password, 10);
    const createdAt = new Date().toISOString();
    const fullName = data.familyName
      ? `${data.givenName} ${data.familyName}`.trim()
      : data.givenName;

    const result = await db
      .insert(schema.users)
      .values({
        username: data.username,
        password_hash: passwordHash,
        name: fullName,
        givenName: data.givenName,
        familyName: data.familyName ?? "",
        created_at: createdAt,
        is_active: true,
        internalExtensions: data.internalExtensions ?? null,
        mobilePhones: data.mobilePhones ?? null,
      })
      .returning({ id: schema.users.id });

    return result[0]?.id ?? 0;
  }

  async updateName(userId: number, data: UpdateUserData): Promise<boolean> {
    if (!data.givenName) return false;
    
    const fullName = data.familyName
      ? `${data.givenName} ${data.familyName}`.trim()
      : data.givenName;
    
    const result = await db
      .update(schema.users)
      .set({
        givenName: data.givenName,
        familyName: data.familyName ?? "",
        name: fullName,
      })
      .where(and(eq(schema.users.id, userId), eq(schema.users.is_active, true)));

    return (result.rowCount ?? 0) > 0;
  }

  async updateInternalExtensions(userId: number, internalExtensions: string | null): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({ internalExtensions })
      .where(and(eq(schema.users.id, userId), eq(schema.users.is_active, true)));

    return (result.rowCount ?? 0) > 0;
  }

  async updateMobilePhones(userId: number, mobilePhones: string | null): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({ mobilePhones })
      .where(and(eq(schema.users.id, userId), eq(schema.users.is_active, true)));

    return (result.rowCount ?? 0) > 0;
  }

  async updateFilters(
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
      .where(and(eq(schema.users.id, userId), eq(schema.users.is_active, true)));

    return (result.rowCount ?? 0) > 0;
  }

  async updateReportAndKpiSettings(userId: number, data: UserUpdateData): Promise<boolean> {
    const updates: Record<string, unknown> = {};
    
    // Report settings
    if (data.report_include_call_summaries !== undefined)
      updates.report_include_call_summaries = data.report_include_call_summaries;
    if (data.report_detailed !== undefined)
      updates.report_detailed = data.report_detailed;
    if (data.report_include_avg_value !== undefined)
      updates.report_include_avg_value = data.report_include_avg_value;
    if (data.report_include_avg_rating !== undefined)
      updates.report_include_avg_rating = data.report_include_avg_rating;
    if (data.report_managed_user_ids !== undefined)
      updates.report_managed_user_ids = data.report_managed_user_ids;
    
    // KPI settings
    if (data.kpi_base_salary !== undefined)
      updates.kpi_base_salary = data.kpi_base_salary;
    if (data.kpi_target_bonus !== undefined)
      updates.kpi_target_bonus = data.kpi_target_bonus;
    if (data.kpi_target_talk_time_minutes !== undefined)
      updates.kpi_target_talk_time_minutes = data.kpi_target_talk_time_minutes;
    
    // Telegram settings
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
    
    // Email settings
    if (data.email_daily_report !== undefined)
      updates.email_daily_report = data.email_daily_report;
    if (data.email_weekly_report !== undefined)
      updates.email_weekly_report = data.email_weekly_report;
    if (data.email_monthly_report !== undefined)
      updates.email_monthly_report = data.email_monthly_report;

    if (Object.keys(updates).length === 0) return true;

    const result = await db
      .update(schema.users)
      .set(updates)
      .where(and(eq(schema.users.id, userId), eq(schema.users.is_active, true)));

    return (result.rowCount ?? 0) > 0;
  }

  async updateTelegramSettings(
    userId: number,
    telegramDailyReport: boolean,
    telegramManagerReport: boolean,
  ): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({
        telegram_daily_report: telegramDailyReport,
        telegram_manager_report: telegramManagerReport,
      })
      .where(and(eq(schema.users.id, userId), eq(schema.users.is_active, true)));

    return (result.rowCount ?? 0) > 0;
  }

  async updatePassword(userId: number, newPassword: string): Promise<boolean> {
    const { hashSync } = await import("bcryptjs");
    const passwordHash = hashSync(newPassword, 10);
    
    const result = await db
      .update(schema.users)
      .set({ password_hash: passwordHash })
      .where(and(eq(schema.users.id, userId), eq(schema.users.is_active, true)));

    return (result.rowCount ?? 0) > 0;
  }

  async findByTelegramConnectToken(token: string): Promise<any | null> {
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

    const updatedUser: any = {
      ...user,
      givenName:
        user.givenName || (user.name ? user.name.split(/\s+/, 2)[0] || "" : ""),
      familyName:
        user.familyName ||
        (user.name ? user.name.split(/\s+/, 2)[1] || "" : ""),
    };

    return updatedUser;
  }

  async saveTelegramConnectToken(userId: number, token: string): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({ telegram_connect_token: token })
      .where(eq(schema.users.id, userId));

    return (result.rowCount ?? 0) > 0;
  }

  async saveTelegramChatId(userId: number, chatId: string): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({
        telegramChatId: chatId,
        telegram_connect_token: null,
      })
      .where(eq(schema.users.id, userId));

    return (result.rowCount ?? 0) > 0;
  }

  async disconnectTelegram(userId: number): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({
        telegramChatId: null,
        telegram_daily_report: false,
        telegram_manager_report: false,
      })
      .where(eq(schema.users.id, userId));

    return (result.rowCount ?? 0) > 0;
  }

  async saveMaxConnectToken(userId: number, token: string): Promise<boolean> {
    const result = await db
      .update(schema.users)
      .set({ max_connect_token: token })
      .where(eq(schema.users.id, userId));

    return (result.rowCount ?? 0) > 0;
  }

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
  }
}
