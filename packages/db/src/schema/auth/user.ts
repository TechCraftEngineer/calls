import { boolean, pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

/**
 * Better Auth user table. Must match app-server auth config.
 *
 * Standard field names (OIDC/OpenID Connect, domain):
 * - given_name, family_name — OIDC standard (вместо first_name/last_name)
 * - internal_extensions — внутренние номера/расширения (телефония)
 * - mobile_phones — мобильные номера
 * - telegram_chat_id — Telegram API standard
 */
export const user = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  username: text("username"),
  bio: text("bio"),
  language: text("language").default("en"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  // additionalFields — OIDC + domain (TS: camelCase, DB: snake_case)
  givenName: text("given_name"),
  familyName: text("family_name"),
  internalExtensions: text("internal_extensions"),
  mobilePhones: text("mobile_phones"),
  telegramChatId: text("telegram_chat_id"),
  
  // Email отчеты
  emailDailyReport: boolean("email_daily_report").default(false),
  emailWeeklyReport: boolean("email_weekly_report").default(false),
  emailMonthlyReport: boolean("email_monthly_report").default(false),
  
  // Telegram отчеты
  telegramDailyReport: boolean("telegram_daily_report").default(false),
  telegramManagerReport: boolean("telegram_manager_report").default(false),
  telegramWeeklyReport: boolean("telegram_weekly_report").default(false),
  telegramMonthlyReport: boolean("telegram_monthly_report").default(false),
  telegramSkipWeekends: boolean("telegram_skip_weekends").default(false),
  
  // MAX отчеты
  maxChatId: text("max_chat_id"),
  maxDailyReport: boolean("max_daily_report").default(false),
  maxManagerReport: boolean("max_manager_report").default(false),
  maxConnectToken: text("max_connect_token"),
  
  // Параметры отчетов
  reportIncludeCallSummaries: boolean("report_include_call_summaries").default(false),
  reportDetailed: boolean("report_detailed").default(false),
  reportIncludeAvgValue: boolean("report_include_avg_value").default(false),
  reportIncludeAvgRating: boolean("report_include_avg_rating").default(false),
  reportManagedUserIds: text("report_managed_user_ids"),
  
  // Настройки KPI
  kpiBaseSalary: integer("kpi_base_salary").default(0),
  kpiTargetBonus: integer("kpi_target_bonus").default(0),
  kpiTargetTalkTimeMinutes: integer("kpi_target_talk_time_minutes").default(0),
  
  // Фильтры
  filterExcludeAnsweringMachine: boolean("filter_exclude_answering_machine").default(false),
  filterMinDuration: integer("filter_min_duration").default(0),
  filterMinReplicas: integer("filter_min_replicas").default(0),
  
  // Интеграция с Telegram
  telegramConnectToken: text("telegram_connect_token"),

});
