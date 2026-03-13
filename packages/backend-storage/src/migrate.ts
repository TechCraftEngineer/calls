#!/usr/bin/env bun

/**
 * Migration script: SQLite to PostgreSQL
 * Migrates data from apps/backend/data/db.sqlite to PostgreSQL
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "@calls/db";
import * as schema from "@calls/db/schema";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));

// SQLite row types
interface SQLiteUser {
  id: number;
  username: string;
  password_hash: string;
  name: string;
  first_name?: string;
  last_name?: string;
  internal_numbers?: string;
  mobile_numbers?: string;
  created_at: string;
  is_active: number;
  telegram_chat_id?: string;
  telegram_connect_token?: string;
  telegram_daily_report?: number;
  telegram_manager_report?: number;
  telegram_weekly_report?: number;
  telegram_monthly_report?: number;
  telegram_skip_weekends?: number;
  max_chat_id?: string;
  max_connect_token?: string;
  max_daily_report?: number;
  max_manager_report?: number;
  email?: string;
  email_daily_report?: number;
  email_weekly_report?: number;
  email_monthly_report?: number;
  filter_exclude_answering_machine?: number;
  filter_min_duration?: number;
  filter_min_replicas?: number;
  report_include_call_summaries?: number;
  report_detailed?: number;
  report_include_avg_value?: number;
  report_include_avg_rating?: number;
  report_managed_user_ids?: string;
  kpi_base_salary?: number;
  kpi_target_bonus?: number;
  kpi_target_talk_time_minutes?: number;
}

interface SQLiteCall {
  id: number;
  filename?: string;
  number?: string;
  timestamp: string;
  name?: string;
  duration?: number;
  direction?: string;
  status?: string;
  size_bytes?: number;
  internal_number?: string;
  source?: string;
  customer_name?: string;
}

interface SQLiteTranscript {
  id: number;
  call_id: number;
  text?: string;
  raw_text?: string;
  title?: string;
  sentiment?: string;
  confidence?: number;
  summary?: string;
  size_kb?: number;
  caller_name?: string;
  call_type?: string;
  call_topic?: string;
}

interface SQLiteEvaluation {
  id: number;
  call_id: number;
  is_quality_analyzable?: number;
  not_analyzable_reason?: string;
  value_score?: number;
  value_explanation?: string;
  manager_score?: number;
  manager_feedback?: string;
  manager_breakdown?: string;
  manager_recommendations?: string;
  created_at: string;
}

interface SQLitePrompt {
  id: number;
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
}

interface SQLiteLog {
  id: number;
  timestamp: string;
  level: string;
  message: string;
  actor: string;
}

function getSqlitePath(): string {
  const isDocker =
    process.env.DEPLOYMENT_ENV === "docker" ||
    existsSync("/.dockerenv") ||
    (process.platform !== "win32" && existsSync("/app"));

  if (isDocker) {
    return "/app/data/db.sqlite";
  }

  const projectRoot = resolve(__dirname, "../../..");
  return resolve(projectRoot, "apps/backend/data/db.sqlite");
}

async function migrateUsers() {
  console.log("👥 Migrating users...");

  const sqlite = new Database(getSqlitePath());
  const users = sqlite
    .prepare("SELECT * FROM users WHERE is_active = 1")
    .all() as SQLiteUser[];

  for (const user of users) {
    const userData = {
      id: user.id,
      username: user.username,
      password_hash: user.password_hash,
      name: user.name,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
      internal_numbers: user.internal_numbers || null,
      mobile_numbers: user.mobile_numbers || null,
      created_at: user.created_at,
      is_active: Boolean(user.is_active),

      // Telegram
      telegram_chat_id: user.telegram_chat_id || null,
      telegram_connect_token: user.telegram_connect_token || null,
      telegram_daily_report: Boolean(user.telegram_daily_report),
      telegram_manager_report: Boolean(user.telegram_manager_report),
      telegram_weekly_report: Boolean(user.telegram_weekly_report),
      telegram_monthly_report: Boolean(user.telegram_monthly_report),
      telegram_skip_weekends: Boolean(user.telegram_skip_weekends || false),

      // MAX
      max_chat_id: user.max_chat_id || null,
      max_connect_token: user.max_connect_token || null,
      max_daily_report: Boolean(user.max_daily_report),
      max_manager_report: Boolean(user.max_manager_report),

      // Email
      email: user.email || null,
      email_daily_report: Boolean(user.email_daily_report),
      email_weekly_report: Boolean(user.email_weekly_report),
      email_monthly_report: Boolean(user.email_monthly_report),

      // Filters
      filter_exclude_answering_machine: Boolean(
        user.filter_exclude_answering_machine,
      ),
      filter_min_duration: Number(user.filter_min_duration) || 0,
      filter_min_replicas: Number(user.filter_min_replicas) || 0,

      // Reports
      report_include_call_summaries: Boolean(
        user.report_include_call_summaries,
      ),
      report_detailed: Boolean(user.report_detailed),
      report_include_avg_value: Boolean(user.report_include_avg_value),
      report_include_avg_rating: Boolean(user.report_include_avg_rating),
      report_managed_user_ids: user.report_managed_user_ids || null,

      // KPI
      kpi_base_salary: Number(user.kpi_base_salary) || 0,
      kpi_target_bonus: Number(user.kpi_target_bonus) || 0,
      kpi_target_talk_time_minutes:
        Number(user.kpi_target_talk_time_minutes) || 0,
    };

    await db.insert(schema.users).values(userData).onConflictDoNothing();
  }

  sqlite.close();
  console.log(`✅ Migrated ${users.length} users`);
}

async function migrateCalls() {
  console.log("📞 Migrating calls...");

  const sqlite = new Database(getSqlitePath());
  const calls = sqlite.prepare("SELECT * FROM calls").all() as SQLiteCall[];

  for (const call of calls) {
    const callData = {
      id: call.id,
      filename: call.filename || null,
      number: call.number || null,
      timestamp: call.timestamp,
      name: call.name || null,
      duration: call.duration || null,
      direction: call.direction || null,
      status: call.status || null,
      size_bytes: call.size_bytes || null,
      internal_number: call.internal_number || null,
      source: call.source || null,
      customer_name: call.customer_name || null,
    };

    await db.insert(schema.calls).values(callData).onConflictDoNothing();
  }

  sqlite.close();
  console.log(`✅ Migrated ${calls.length} calls`);
}

async function migrateTranscripts() {
  console.log("📝 Migrating transcripts...");

  const sqlite = new Database(getSqlitePath());
  const transcripts = sqlite
    .prepare("SELECT * FROM transcripts")
    .all() as SQLiteTranscript[];

  for (const transcript of transcripts) {
    const transcriptData = {
      id: transcript.id,
      call_id: transcript.call_id,
      text: transcript.text || null,
      raw_text: transcript.raw_text || null,
      title: transcript.title || null,
      sentiment: transcript.sentiment || null,
      confidence: transcript.confidence || null,
      summary: transcript.summary || null,
      size_kb: transcript.size_kb || null,
      caller_name: transcript.caller_name || null,
      call_type: transcript.call_type || null,
      call_topic: transcript.call_topic || null,
    };

    await db
      .insert(schema.transcripts)
      .values(transcriptData)
      .onConflictDoNothing();
  }

  sqlite.close();
  console.log(`✅ Migrated ${transcripts.length} transcripts`);
}

async function migrateEvaluations() {
  console.log("⭐ Migrating evaluations...");

  const sqlite = new Database(getSqlitePath());
  const evaluations = sqlite
    .prepare("SELECT * FROM call_evaluations")
    .all() as SQLiteEvaluation[];

  for (const evaluation of evaluations) {
    const evalData = {
      id: evaluation.id,
      call_id: evaluation.call_id,
      is_quality_analyzable: Boolean(evaluation.is_quality_analyzable),
      not_analyzable_reason: evaluation.not_analyzable_reason || null,
      value_score: evaluation.value_score || null,
      value_explanation: evaluation.value_explanation || null,
      manager_score: evaluation.manager_score || null,
      manager_feedback: evaluation.manager_feedback || null,
      manager_breakdown: evaluation.manager_breakdown || null,
      manager_recommendations: evaluation.manager_recommendations || null,
      created_at: evaluation.created_at,
    };

    await db
      .insert(schema.callEvaluations)
      .values(evalData)
      .onConflictDoNothing();
  }

  sqlite.close();
  console.log(`✅ Migrated ${evaluations.length} evaluations`);
}

async function migratePrompts() {
  console.log("🔧 Migrating prompts...");

  const sqlite = new Database(getSqlitePath());
  const prompts = sqlite
    .prepare("SELECT * FROM prompts")
    .all() as SQLitePrompt[];

  for (const prompt of prompts) {
    const promptData = {
      id: prompt.id,
      key: prompt.key,
      value: prompt.value,
      description: prompt.description || null,
      updated_at: prompt.updated_at || null,
    };

    await db.insert(schema.prompts).values(promptData).onConflictDoNothing();
  }

  sqlite.close();
  console.log(`✅ Migrated ${prompts.length} prompts`);
}

async function migrateActivityLog() {
  console.log("📋 Migrating activity log...");

  const sqlite = new Database(getSqlitePath());
  const logs = sqlite
    .prepare("SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT 100")
    .all() as SQLiteLog[];

  for (const log of logs) {
    const logData = {
      id: log.id,
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      actor: log.actor,
    };

    await db.insert(schema.activityLog).values(logData).onConflictDoNothing();
  }

  sqlite.close();
  console.log(`✅ Migrated ${logs.length} activity log entries`);
}

async function main() {
  console.log("🚀 Starting migration from SQLite to PostgreSQL...");
  console.log(`📁 SQLite path: ${getSqlitePath()}`);

  try {
    // Check if SQLite file exists
    if (!existsSync(getSqlitePath())) {
      console.log("⚠️  SQLite file not found. Skipping migration.");
      return;
    }

    // Run migrations in order
    await migrateUsers();
    await migrateCalls();
    await migrateTranscripts();
    await migrateEvaluations();
    await migratePrompts();
    await migrateActivityLog();

    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}
