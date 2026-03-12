/**
 * Backend storage - SQLite layer compatible with Python backend db.sqlite
 * Uses the same DB file (apps/backend/data/db.sqlite) for migration compatibility.
 */

import { pbkdf2Sync } from "node:crypto";
import { compareSync, hashSync } from "bcryptjs";
import Database from "better-sqlite3";
import { resolve, dirname } from "node:path";
import { existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getDbPath(): string {
  if (process.env.BACKEND_DB_PATH) return process.env.BACKEND_DB_PATH;
  // Same logic as Python: Docker uses /app/data, local uses backend/data
  const isDocker =
    process.env.DEPLOYMENT_ENV === "docker" ||
    existsSync("/.dockerenv") ||
    (process.platform !== "win32" && existsSync("/app"));

  if (isDocker) {
    return "/app/data/db.sqlite";
  }
  // From packages/backend-storage/src -> project root -> apps/backend/data
  const projectRoot = resolve(__dirname, "../../..");
  return resolve(projectRoot, "apps/backend/data/db.sqlite");
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dbPath = getDbPath();
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    db = new Database(dbPath);
    db.pragma("encoding = 'UTF-8'");
  }
  return db;
}

export interface Call {
  id: number;
  filename: string | null;
  number: string | null;
  timestamp: string;
  name: string | null;
  duration: number | null;
  direction: string | null;
  status: string | null;
  size_bytes: number | null;
  internal_number: string | null;
  source: string | null;
  customer_name: string | null;
  [key: string]: unknown;
}

export interface Transcript {
  id: number;
  call_id: number;
  text: string | null;
  raw_text: string | null;
  title: string | null;
  sentiment: string | null;
  confidence: number | null;
  summary: string | null;
  size_kb: number | null;
  caller_name: string | null;
  call_type: string | null;
  call_topic: string | null;
  [key: string]: unknown;
}

export interface Evaluation {
  id: number;
  call_id: number;
  value_score: number | null;
  value_explanation: string | null;
  manager_score: number | null;
  manager_feedback: string | null;
  manager_recommendations: string[] | null;
  is_quality_analyzable: boolean | null;
  not_analyzable_reason: string | null;
  manager_breakdown: string | null;
  [key: string]: unknown;
}

export interface User {
  id: number;
  username: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  internal_numbers: string | null;
  mobile_numbers: string | null;
  created_at: string;
  [key: string]: unknown;
}

function rowToObject(row: Record<string, unknown>): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    obj[key] = (row as Record<string, unknown>)[key];
  }
  return obj;
}

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
}

export interface CallWithTranscript {
  call: Call;
  transcript: Transcript | null;
  evaluation: Evaluation | null;
}

export const storage = {
  getCall(id: number): Call | null {
    const row = getDb().prepare("SELECT * FROM calls WHERE id = ?").get(id);
    return row ? (rowToObject(row as Record<string, unknown>) as Call) : null;
  },

  deleteCall(callId: number): boolean {
    getDb().prepare("PRAGMA foreign_keys = ON").run();
    const result = getDb().prepare("DELETE FROM calls WHERE id = ?").run(callId);
    return result.changes > 0;
  },

  getTranscriptByCallId(callId: number): Transcript | null {
    const row = getDb()
      .prepare("SELECT * FROM transcripts WHERE call_id = ?")
      .get(callId);
    return row ? (rowToObject(row as Record<string, unknown>) as Transcript) : null;
  },

  getEvaluation(callId: number): Evaluation | null {
    const row = getDb()
      .prepare("SELECT * FROM call_evaluations WHERE call_id = ?")
      .get(callId);
    return row ? (rowToObject(row as Record<string, unknown>) as Evaluation) : null;
  },

  getCallsWithTranscripts(params: GetCallsParams = {}): CallWithTranscript[] {
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
    } = params;

    let sql = `
      SELECT c.*,
        t.id as transcript_id, t.text as transcript_text, t.raw_text as transcript_raw_text,
        t.title as transcript_title, t.sentiment as transcript_sentiment,
        t.confidence as transcript_confidence, t.summary as transcript_summary,
        t.size_kb as transcript_size_kb, t.caller_name as transcript_caller_name,
        t.call_type as transcript_call_type, t.call_topic as transcript_call_topic,
        ce.id as eval_id, ce.value_score as eval_value_score, ce.value_explanation as eval_value_explanation,
        ce.manager_score as eval_manager_score, ce.manager_feedback as eval_manager_feedback,
        ce.manager_recommendations as eval_manager_recommendations,
        ce.is_quality_analyzable as eval_is_quality_analyzable
      FROM calls c
      LEFT JOIN transcripts t ON c.id = t.call_id
      LEFT JOIN call_evaluations ce ON c.id = ce.call_id
      WHERE 1=1
    `;
    const stmtParams: unknown[] = [];

    if (dateFrom) {
      sql += " AND c.timestamp >= ?";
      stmtParams.push(dateFrom);
    }
    if (dateTo) {
      sql += " AND c.timestamp <= ?";
      stmtParams.push(dateTo);
    }
    if (internalNumbers?.length) {
      sql += ` AND c.internal_number IN (${internalNumbers.map(() => "?").join(",")})`;
      stmtParams.push(...internalNumbers);
    }
    if (mobileNumbers?.length) {
      sql += ` AND c.number IN (${mobileNumbers.map(() => "?").join(",")})`;
      stmtParams.push(...mobileNumbers);
    }
    if (direction) {
      sql += " AND c.direction = ?";
      stmtParams.push(direction);
    }
    if (operators?.length) {
      sql += ` AND c.source IN (${operators.map(() => "?").join(",")})`;
      stmtParams.push(...operators);
    }
    if (valueScores?.length) {
      sql += ` AND ce.value_score IN (${valueScores.map(() => "?").join(",")})`;
      stmtParams.push(...valueScores);
    }

    sql += " ORDER BY c.timestamp DESC, c.id DESC LIMIT ? OFFSET ?";
    stmtParams.push(limit, offset);

    const rows = getDb().prepare(sql).all(...stmtParams) as Record<string, unknown>[];
    const result: CallWithTranscript[] = [];

    for (const d of rows) {
      const call: Call = {
        id: d.id as number,
        filename: d.filename as string | null,
        number: d.number as string | null,
        timestamp: d.timestamp as string,
        name: d.name as string | null,
        duration: d.duration as number | null,
        direction: d.direction as string | null,
        status: d.status as string | null,
        size_bytes: d.size_bytes as number | null,
        internal_number: d.internal_number as string | null,
        source: d.source as string | null,
        customer_name: d.customer_name as string | null,
      };

      let transcript: Transcript | null = null;
      if (d.transcript_id) {
        transcript = {
          id: d.transcript_id as number,
          call_id: call.id,
          text: d.transcript_text as string | null,
          raw_text: d.transcript_raw_text as string | null,
          title: d.transcript_title as string | null,
          sentiment: d.transcript_sentiment as string | null,
          confidence: d.transcript_confidence as number | null,
          summary: d.transcript_summary as string | null,
          size_kb: d.transcript_size_kb as number | null,
          caller_name: d.transcript_caller_name as string | null,
          call_type: d.transcript_call_type as string | null,
          call_topic: d.transcript_call_topic as string | null,
        };
      }

      let evaluation: Evaluation | null = null;
      if (d.eval_id) {
        let recs: string[] | null = null;
        const rawRecs = d.eval_manager_recommendations;
        if (Array.isArray(rawRecs)) recs = rawRecs;
        else if (typeof rawRecs === "string" && rawRecs) {
          try {
            recs = JSON.parse(rawRecs) as string[];
          } catch {
            recs = [rawRecs];
          }
        }
        evaluation = {
          id: d.eval_id as number,
          call_id: call.id,
          value_score: d.eval_value_score as number | null,
          value_explanation: d.eval_value_explanation as string | null,
          manager_score: d.eval_manager_score as number | null,
          manager_feedback: d.eval_manager_feedback as string | null,
          manager_recommendations: recs,
          is_quality_analyzable: d.eval_is_quality_analyzable as boolean | null,
          not_analyzable_reason: null,
          manager_breakdown: null,
        };
      }

      result.push({ call, transcript, evaluation });
    }
    return result;
  },

  countCalls(params: Omit<GetCallsParams, "limit" | "offset"> = {}): number {
    const {
      dateFrom,
      dateTo,
      internalNumbers,
      mobileNumbers,
      direction,
      valueScores,
      operators,
    } = params;

    let sql = `
      SELECT COUNT(DISTINCT c.id) as cnt
      FROM calls c
      LEFT JOIN call_evaluations ce ON c.id = ce.call_id
      WHERE 1=1
    `;
    const stmtParams: unknown[] = [];

    if (dateFrom) {
      sql += " AND c.timestamp >= ?";
      stmtParams.push(dateFrom);
    }
    if (dateTo) {
      sql += " AND c.timestamp <= ?";
      stmtParams.push(dateTo);
    }
    if (internalNumbers?.length) {
      sql += ` AND c.internal_number IN (${internalNumbers.map(() => "?").join(",")})`;
      stmtParams.push(...internalNumbers);
    }
    if (mobileNumbers?.length) {
      sql += ` AND c.number IN (${mobileNumbers.map(() => "?").join(",")})`;
      stmtParams.push(...mobileNumbers);
    }
    if (direction) {
      sql += " AND c.direction = ?";
      stmtParams.push(direction);
    }
    if (operators?.length) {
      sql += ` AND c.source IN (${operators.map(() => "?").join(",")})`;
      stmtParams.push(...operators);
    }
    if (valueScores?.length) {
      sql += ` AND ce.value_score IN (${valueScores.map(() => "?").join(",")})`;
      stmtParams.push(...valueScores);
    }

    const row = getDb().prepare(sql).get(...stmtParams) as { cnt: number };
    return row?.cnt ?? 0;
  },

  getUserByUsername(username: string): User | null {
    const row = getDb()
      .prepare("SELECT * FROM users WHERE username = ? AND is_active = 1")
      .get(username) as Record<string, unknown> | undefined;
    if (!row) return null;
    const d = rowToObject(row) as User;
    if (!d.first_name && d.name) {
      const parts = String(d.name).split(/\s+/, 2);
      d.first_name = parts[0] ?? "";
      d.last_name = parts[1] ?? "";
    }
    return d;
  },

  verifyPassword(username: string, password: string): boolean {
    const user = storage.getUserByUsername(username);
    if (!user) return false;
    const hash = (user as Record<string, unknown>).password_hash as string;
    if (!hash) return false;
    if (hash.startsWith("pbkdf2:sha256")) {
      return verifyWerkzeugHash(password, hash);
    }
    return verifyBcryptSync(password, hash);
  },

  getAllUsers(): User[] {
    const rows = getDb()
      .prepare(
        "SELECT id, username, name, first_name, last_name, created_at, internal_numbers, mobile_numbers, telegram_chat_id, telegram_daily_report, telegram_manager_report, max_chat_id, max_daily_report, max_manager_report, filter_exclude_answering_machine, filter_min_duration, filter_min_replicas, email, telegram_weekly_report, telegram_monthly_report, email_daily_report, email_weekly_report, email_monthly_report, report_include_call_summaries, report_detailed, report_include_avg_value, report_include_avg_rating, kpi_base_salary, kpi_target_bonus, kpi_target_talk_time_minutes FROM users WHERE is_active = 1 ORDER BY created_at DESC"
      )
      .all() as Record<string, unknown>[];
    return rows.map((r) => {
      const u = rowToObject(r) as User;
      if (!u.first_name && u.name) {
        const parts = String(u.name).split(/\s+/, 2);
        u.first_name = parts[0] ?? "";
        u.last_name = parts[1] ?? "";
      }
      return u;
    });
  },

  getUser(id: number): User | null {
    const row = getDb()
      .prepare("SELECT * FROM users WHERE id = ? AND is_active = 1")
      .get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    const d = rowToObject(row) as User;
    if (!d.first_name && d.name) {
      const parts = String(d.name).split(/\s+/, 2);
      d.first_name = parts[0] ?? "";
      d.last_name = parts[1] ?? "";
    }
    return d;
  },

  createUser(
    username: string,
    password: string,
    firstName: string,
    lastName = "",
    internalNumbers?: string | null,
    mobileNumbers?: string | null
  ): number {
    const passwordHash = hashSync(password, 10); // bcrypt
    const createdAt = new Date().toISOString();
    const fullName = lastName ? `${firstName} ${lastName}`.trim() : firstName;
    const stmt = getDb().prepare(
      "INSERT INTO users (username, password_hash, name, first_name, last_name, created_at, is_active, internal_numbers, mobile_numbers) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)"
    );
    const result = stmt.run(username, passwordHash, fullName, firstName, lastName, createdAt, internalNumbers ?? null, mobileNumbers ?? null);
    return result.lastInsertRowid as number;
  },

  updateUserName(userId: number, firstName: string, lastName = ""): boolean {
    const fullName = lastName ? `${firstName} ${lastName}`.trim() : firstName;
    const result = getDb().prepare("UPDATE users SET first_name = ?, last_name = ?, name = ? WHERE id = ? AND is_active = 1").run(firstName, lastName, fullName, userId);
    return result.changes > 0;
  },

  updateUserInternalNumbers(userId: number, internalNumbers: string | null): boolean {
    const result = getDb().prepare("UPDATE users SET internal_numbers = ? WHERE id = ? AND is_active = 1").run(internalNumbers ?? null, userId);
    return result.changes > 0;
  },

  updateUserMobileNumbers(userId: number, mobileNumbers: string | null): boolean {
    const result = getDb().prepare("UPDATE users SET mobile_numbers = ? WHERE id = ? AND is_active = 1").run(mobileNumbers ?? null, userId);
    return result.changes > 0;
  },

  updateUserPassword(userId: number, newPassword: string): boolean {
    const passwordHash = hashSync(newPassword, 10);
    const result = getDb().prepare("UPDATE users SET password_hash = ? WHERE id = ? AND is_active = 1").run(passwordHash, userId);
    return result.changes > 0;
  },

  updateUserFilters(userId: number, excludeAnsweringMachine: boolean, minDuration: number, minReplicas: number): boolean {
    const result = getDb()
      .prepare("UPDATE users SET filter_exclude_answering_machine = ?, filter_min_duration = ?, filter_min_replicas = ? WHERE id = ? AND is_active = 1")
      .run(excludeAnsweringMachine ? 1 : 0, minDuration, minReplicas, userId);
    return result.changes > 0;
  },

  updateUserTelegramSettings(userId: number, telegramChatId: string | null, telegramDailyReport: boolean, telegramManagerReport: boolean): boolean {
    const result = getDb()
      .prepare("UPDATE users SET telegram_chat_id = ?, telegram_daily_report = ?, telegram_manager_report = ? WHERE id = ? AND is_active = 1")
      .run(telegramChatId, telegramDailyReport ? 1 : 0, telegramManagerReport ? 1 : 0, userId);
    return result.changes > 0;
  },

  updateUserReportKpiSettings(
    userId: number,
    data: {
      email?: string | null;
      telegram_weekly_report?: boolean;
      telegram_monthly_report?: boolean;
      email_daily_report?: boolean;
      email_weekly_report?: boolean;
      email_monthly_report?: boolean;
      report_include_call_summaries?: boolean;
      report_detailed?: boolean;
      report_include_avg_value?: boolean;
      report_include_avg_rating?: boolean;
      kpi_base_salary?: number;
      kpi_target_bonus?: number;
      kpi_target_talk_time_minutes?: number;
      telegram_skip_weekends?: boolean;
      report_managed_user_ids?: string | null;
    }
  ): boolean {
    const u = storage.getUser(userId);
    if (!u) return false;
    const d = u as Record<string, unknown>;
    const result = getDb()
      .prepare(
        `UPDATE users SET email = ?, telegram_weekly_report = ?, telegram_monthly_report = ?,
         email_daily_report = ?, email_weekly_report = ?, email_monthly_report = ?,
         report_include_call_summaries = ?, report_detailed = ?, report_include_avg_value = ?, report_include_avg_rating = ?,
         kpi_base_salary = ?, kpi_target_bonus = ?, kpi_target_talk_time_minutes = ?,
         telegram_skip_weekends = ?, report_managed_user_ids = ? WHERE id = ? AND is_active = 1`
      )
      .run(
        data.email ?? d.email ?? null,
        (data.telegram_weekly_report ?? d.telegram_weekly_report ?? false) ? 1 : 0,
        (data.telegram_monthly_report ?? d.telegram_monthly_report ?? false) ? 1 : 0,
        (data.email_daily_report ?? d.email_daily_report ?? false) ? 1 : 0,
        (data.email_weekly_report ?? d.email_weekly_report ?? false) ? 1 : 0,
        (data.email_monthly_report ?? d.email_monthly_report ?? false) ? 1 : 0,
        (data.report_include_call_summaries ?? d.report_include_call_summaries ?? false) ? 1 : 0,
        (data.report_detailed ?? d.report_detailed ?? false) ? 1 : 0,
        (data.report_include_avg_value ?? d.report_include_avg_value ?? false) ? 1 : 0,
        (data.report_include_avg_rating ?? d.report_include_avg_rating ?? false) ? 1 : 0,
        Number(data.kpi_base_salary ?? d.kpi_base_salary ?? 0),
        Number(data.kpi_target_bonus ?? d.kpi_target_bonus ?? 0),
        Number(data.kpi_target_talk_time_minutes ?? d.kpi_target_talk_time_minutes ?? 0),
        (data.telegram_skip_weekends ?? d.telegram_skip_weekends ?? false) ? 1 : 0,
        data.report_managed_user_ids ?? d.report_managed_user_ids ?? null,
        userId
      );
    return result.changes > 0;
  },

  deleteUser(userId: number): boolean {
    const result = getDb().prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(userId);
    return result.changes > 0;
  },

  saveTelegramConnectToken(userId: number, token: string): boolean {
    try {
      getDb().prepare("UPDATE users SET telegram_connect_token = ? WHERE id = ?").run(token, userId);
      return true;
    } catch {
      return false;
    }
  },

  saveMaxConnectToken(userId: number, token: string): boolean {
    try {
      getDb().prepare("UPDATE users SET max_connect_token = ? WHERE id = ?").run(token, userId);
      return true;
    } catch {
      return false;
    }
  },

  disconnectTelegram(userId: number): boolean {
    try {
      getDb().prepare("UPDATE users SET telegram_chat_id = NULL, telegram_daily_report = 0, telegram_manager_report = 0 WHERE id = ?").run(userId);
      return true;
    } catch {
      return false;
    }
  },

  disconnectMax(userId: number): boolean {
    try {
      getDb().prepare("UPDATE users SET max_chat_id = NULL, max_daily_report = 0, max_manager_report = 0 WHERE id = ?").run(userId);
      return true;
    } catch {
      return false;
    }
  },

  getPrompt(key: string, defaultValue?: string): string | null {
    const row = getDb().prepare("SELECT value FROM prompts WHERE key = ?").get(key) as { value: string } | undefined;
    return row ? String(row.value) : (defaultValue ?? null);
  },

  getAllPrompts(): { key: string; value: string; description: string | null; updated_at: string | null }[] {
    const rows = getDb().prepare("SELECT key, value, description, updated_at FROM prompts ORDER BY key").all() as Record<string, unknown>[];
    return rows.map((r) => ({
      key: String(r.key),
      value: String(r.value ?? ""),
      description: (r.description as string) ?? null,
      updated_at: (r.updated_at as string) ?? null,
    }));
  },

  updatePrompt(key: string, value: string, description?: string | null): boolean {
    const now = new Date().toISOString();
    const existing = getDb().prepare("SELECT 1 FROM prompts WHERE key = ?").get(key);
    if (existing) {
      const stmt = description
        ? getDb().prepare("UPDATE prompts SET value = ?, description = ?, updated_at = ? WHERE key = ?")
        : getDb().prepare("UPDATE prompts SET value = ?, updated_at = ? WHERE key = ?");
      const result = description ? stmt.run(value, description, now, key) : stmt.run(value, now, key);
      return (result as { changes: number }).changes > 0;
    }
    getDb().prepare("INSERT INTO prompts (key, value, description, updated_at) VALUES (?, ?, ?, ?)").run(key, value, description ?? "", now);
    return true;
  },

  addActivityLog(level: string, message: string, actor: string): void {
    getDb().prepare("INSERT INTO activity_log (timestamp, level, message, actor) VALUES (?, ?, ?, ?)").run(new Date().toISOString(), level, message, actor);
  },

  addEvaluation(data: {
    call_id: number;
    value_score?: number | null;
    value_explanation?: string | null;
    manager_score?: number | null;
    manager_feedback?: string | null;
    manager_breakdown?: Record<string, unknown> | string | null;
    manager_recommendations?: string[] | null;
    is_quality_analyzable?: boolean;
    not_analyzable_reason?: string | null;
  }): number {
    const breakdown = typeof data.manager_breakdown === "object" ? JSON.stringify(data.manager_breakdown) : data.manager_breakdown ?? null;
    const recommendations = Array.isArray(data.manager_recommendations) ? JSON.stringify(data.manager_recommendations) : null;
    const stmt = getDb().prepare(
      `INSERT INTO call_evaluations (call_id, is_quality_analyzable, not_analyzable_reason, value_score, value_explanation, manager_score, manager_feedback, manager_breakdown, manager_recommendations, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(call_id) DO UPDATE SET is_quality_analyzable=excluded.is_quality_analyzable, not_analyzable_reason=excluded.not_analyzable_reason, value_score=excluded.value_score, value_explanation=excluded.value_explanation, manager_score=excluded.manager_score, manager_feedback=excluded.manager_feedback, manager_breakdown=excluded.manager_breakdown, manager_recommendations=excluded.manager_recommendations, created_at=excluded.created_at`
    );
    const result = stmt.run(
      data.call_id,
      data.is_quality_analyzable !== false ? 1 : 0,
      data.not_analyzable_reason ?? null,
      data.value_score ?? null,
      data.value_explanation ?? null,
      data.manager_score ?? null,
      data.manager_feedback ?? null,
      breakdown,
      recommendations,
      new Date().toISOString()
    );
    return result.lastInsertRowid as number;
  },

  calculateMetrics(): { total_calls: number; transcribed: number; avg_duration: number; last_sync: string | null } {
    const db = getDb();
    const totalCalls = (db.prepare("SELECT COUNT(*) as c FROM calls").get() as { c: number }).c;
    const transcribed = (db.prepare("SELECT COUNT(*) as c FROM transcripts").get() as { c: number }).c;
    const avgRow = db.prepare("SELECT AVG(duration) as a FROM calls WHERE duration > 0").get() as { a: number | null };
    const avgDuration = Math.round(avgRow?.a ?? 0);
    const lastSyncRow = db.prepare("SELECT MAX(timestamp) as t FROM activity_log").get() as { t: string | null };
    return {
      total_calls: totalCalls,
      transcribed,
      avg_duration: avgDuration,
      last_sync: lastSyncRow?.t ?? null,
    };
  },

  getEvaluationsStats(params: { dateFrom?: string; dateTo?: string; internalNumbers?: string[] }): Record<
    string,
    { name: string; internal_number: string | null; incoming: { count: number; duration: number }; outgoing: { count: number; duration: number }; score_distribution?: Record<number, { count: number; duration: number }> }
  > {
    const { dateFrom, dateTo, internalNumbers } = params;
    let sql = `SELECT c.internal_number, c.name as manager_name, c.direction, count(*) as total_calls, sum(c.duration) as total_duration FROM calls c LEFT JOIN call_evaluations ce ON c.id = ce.call_id WHERE 1=1`;
    const par: unknown[] = [];
    if (dateFrom) {
      sql += " AND c.timestamp >= ?";
      par.push(dateFrom);
    }
    if (dateTo) {
      sql += " AND c.timestamp <= ?";
      par.push(dateTo);
    }
    if (internalNumbers?.length) {
      sql += ` AND c.internal_number IN (${internalNumbers.map(() => "?").join(",")})`;
      par.push(...internalNumbers);
    }
    sql += " GROUP BY c.internal_number, c.name, c.direction";
    const rows = getDb().prepare(sql).all(...par) as Record<string, unknown>[];
    const stats: Record<string, { name: string; internal_number: string | null; incoming: { count: number; duration: number }; outgoing: { count: number; duration: number }; score_distribution?: Record<number, { count: number; duration: number }> }> = {};
    for (const row of rows) {
      const key = (row.manager_name ?? row.internal_number ?? "Unknown") as string;
      if (!stats[key]) stats[key] = { name: key, internal_number: row.internal_number as string | null, incoming: { count: 0, duration: 0 }, outgoing: { count: 0, duration: 0 } };
      const dir = String(row.direction ?? "").toLowerCase();
      const tgt = dir === "входящий" || dir === "incoming" ? stats[key].incoming : stats[key].outgoing;
      tgt.count += (row.total_calls as number) ?? 0;
      tgt.duration += (row.total_duration as number) ?? 0;
    }
    let sqlDist = `SELECT c.name as manager_name, c.internal_number, ce.value_score, count(*) as count, sum(c.duration) as duration FROM calls c JOIN call_evaluations ce ON c.id = ce.call_id WHERE ce.value_score IS NOT NULL`;
    const parDist: unknown[] = [];
    if (dateFrom) {
      sqlDist += " AND c.timestamp >= ?";
      parDist.push(dateFrom);
    }
    if (dateTo) {
      sqlDist += " AND c.timestamp <= ?";
      parDist.push(dateTo);
    }
    if (internalNumbers?.length) {
      sqlDist += ` AND c.internal_number IN (${internalNumbers.map(() => "?").join(",")})`;
      parDist.push(...internalNumbers);
    }
    sqlDist += " GROUP BY c.name, c.internal_number, ce.value_score";
    const distRows = getDb().prepare(sqlDist).all(...parDist) as Record<string, unknown>[];
    for (const row of distRows) {
      const key = (row.manager_name ?? row.internal_number ?? "Unknown") as string;
      if (!stats[key]) continue;
      if (!stats[key].score_distribution) stats[key].score_distribution = {};
      const score = row.value_score as number;
      const dist = stats[key].score_distribution ?? {};
      dist[score] = { count: row.count as number, duration: row.duration as number };
      stats[key].score_distribution = dist;
    }
    return stats;
  },
};

// Werkzeug-compatible PBKDF2 verification (Python's default)
function verifyWerkzeugHash(password: string, fullHash: string): boolean {
  const parts = fullHash.split("$");
  if (parts.length < 4) return false;
  const [, method, saltB64, hashB64] = parts;
  if (method !== "pbkdf2:sha256" || !saltB64 || !hashB64) return false;

  const salt = Buffer.from(saltB64, "base64");
  const iterMatch = fullHash.match(/\$(\d+)\$/);
  const iterations = iterMatch && iterMatch[1] ? parseInt(iterMatch[1], 10) : 260000;
  const keylen = 32;
  const derived = pbkdf2Sync(password, salt, iterations, keylen, "sha256");
  const derivedB64 = derived.toString("base64").replace(/=/g, "");
  return derivedB64 === hashB64;
}

// Bcrypt verification (passlib format)
function verifyBcryptSync(password: string, hash: string): boolean {
  try {
    return compareSync(password, hash);
  } catch {
    return false;
  }
}
