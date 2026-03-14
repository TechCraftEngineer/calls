# Database Architecture Audit: SaaS Readiness & Scalability

## Executive Summary

**Overall Grade: C+ (Needs Significant Improvements)**

Текущая схема имеет хорошую основу для multi-tenancy, но содержит критические проблемы для production SaaS:

### Critical Issues (Must Fix)
1. ❌ **Отсутствие workspaceId в user-settings таблицах** — нарушает multi-tenancy
2. ❌ **Нет индексов на user-settings таблицах** — проблемы с производительностью
3. ❌ **Отсутствие tenant isolation на уровне RLS** — риск утечки данных
4. ❌ **Нет стратегии партиционирования для calls** — проблемы при росте
5. ❌ **Отсутствие audit trail** — compliance проблемы

### Good Practices (Keep)
1. ✅ Использование workspaceId для multi-tenancy
2. ✅ Soft delete в users
3. ✅ UUIDv7 для ID (time-ordered)
4. ✅ Composite индексы для частых запросов

---

## Detailed Analysis

### 1. Multi-Tenancy Architecture

#### ✅ Good: Workspace-based isolation
```typescript
// Все основные таблицы имеют workspaceId
workspaceId: text("workspace_id")
  .references(() => workspaces.id, { onDelete: "cascade" })
  .notNull()
```

#### ❌ Critical: User settings не привязаны к workspace

**Проблема:**
```typescript
// user-notification-settings.ts
export const userNotificationSettings = pgTable("user_notification_settings", {
  userId: text("user_id").primaryKey()
  // ❌ НЕТ workspaceId!
});
```

**Последствия:**
- Пользователь может быть в нескольких workspace, но настройки глобальные
- Невозможно иметь разные настройки для разных workspace
- Нарушение принципа tenant isolation

**Fix Required:**
```typescript
export const userNotificationSettings = pgTable("user_notification_settings", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  // ... остальные поля
}, (table) => [
  unique("user_notification_settings_user_workspace").on(
    table.userId,
    table.workspaceId
  ),
  index("user_notification_settings_workspace_idx").on(table.workspaceId),
  index("user_notification_settings_user_idx").on(table.userId),
]);
```

---

### 2. Performance & Indexing

#### ✅ Good: Composite indexes для частых запросов
```typescript
index("calls_workspace_timestamp_idx").on(table.workspaceId, table.timestamp)
```

#### ❌ Critical: Отсутствие индексов на user-settings

**Проблема:**
```typescript
// user-notification-settings.ts - НЕТ ИНДЕКСОВ!
export const userNotificationSettings = pgTable("user_notification_settings", {
  userId: text("user_id").primaryKey(),
  // ... 15+ полей
  // ❌ Нет индексов для поиска по telegramConnectToken, maxConnectToken
});
```

**Fix Required:**
```typescript
(table) => [
  index("user_notification_settings_telegram_token_idx").on(
    table.telegramConnectToken
  ),
  index("user_notification_settings_max_token_idx").on(
    table.maxConnectToken
  ),
]
```

#### ⚠️ Warning: Отсутствие партиционирования для calls

**Проблема:** При росте до миллионов записей таблица `calls` станет узким местом.

**Recommendation:**
```sql
-- Партиционирование по timestamp (monthly)
CREATE TABLE calls (
  -- ... columns
) PARTITION BY RANGE (timestamp);

CREATE TABLE calls_2024_01 PARTITION OF calls
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

---

### 3. Data Integrity & Constraints

#### ✅ Good: Foreign keys с cascade
```typescript
.references(() => workspaces.id, { onDelete: "cascade" })
```

#### ❌ Missing: Check constraints

**Проблема:** Нет валидации на уровне БД

**Fix Required:**
```typescript
// calls.ts
duration: integer("duration")
  .notNull()
  .$check(sql`duration >= 0`),

// user-kpi-settings.ts
baseSalary: integer("base_salary")
  .default(0)
  .notNull()
  .$check(sql`base_salary >= 0`),
```

#### ❌ Missing: Unique constraints где нужно

**Проблема:**
```typescript
// calls.ts
filename: text("filename").unique(), // ✅ Good
// Но нет unique на (workspaceId, filename) - может быть дубликат в разных workspace
```

**Fix:**
```typescript
(table) => [
  unique("calls_workspace_filename_unique").on(
    table.workspaceId,
    table.filename
  ),
]
```

---

### 4. Security & Compliance

#### ❌ Critical: Отсутствие Row Level Security (RLS)

**Проблема:** Нет защиты на уровне БД от утечки данных между tenants.

**Fix Required:**
```sql
-- Enable RLS
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Policy для workspace isolation
CREATE POLICY calls_workspace_isolation ON calls
  USING (workspace_id = current_setting('app.current_workspace_id')::text);

-- Policy для workspace members
CREATE POLICY calls_member_access ON calls
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = current_setting('app.current_user_id')::text
    )
  );
```

#### ❌ Critical: Отсутствие audit trail

**Проблема:** `activity_log` есть, но не используется автоматически.

**Fix Required:**
```typescript
// audit-log.ts
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "set null" }),
  tableName: text("table_name").notNull(),
  recordId: text("record_id").notNull(),
  action: text("action").notNull(), // 'INSERT', 'UPDATE', 'DELETE'
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("audit_log_workspace_idx").on(table.workspaceId),
  index("audit_log_user_idx").on(table.userId),
  index("audit_log_table_record_idx").on(table.tableName, table.recordId),
  index("audit_log_created_at_idx").on(table.createdAt),
]);
```

#### ⚠️ Warning: Sensitive data в plain text

**Проблема:**
```typescript
// account.ts
accessToken: text("access_token"), // ❌ Должен быть encrypted
refreshToken: text("refresh_token"), // ❌ Должен быть encrypted
```

**Recommendation:** Использовать pgcrypto или шифрование на уровне приложения.

---

### 5. Scalability Concerns

#### ❌ Critical: Нет стратегии для архивации старых данных

**Проблема:** Таблицы `calls`, `transcripts`, `activity_log` будут расти бесконечно.

**Fix Required:**
```typescript
// calls.ts - добавить поле для архивации
archivedAt: timestamp("archived_at"),
isArchived: boolean("is_archived").default(false).notNull(),

// Индекс для быстрого поиска активных записей
index("calls_active_idx").on(table.workspaceId, table.isArchived),
```

**Strategy:**
1. Архивировать звонки старше 1 года в отдельную таблицу `calls_archive`
2. Использовать партиционирование по `archivedAt`
3. Перемещать в cold storage (S3 Glacier)

#### ⚠️ Warning: JSONB поля без индексов

**Проблема:**
```typescript
metadata: jsonb("metadata").$type<Record<string, unknown>>(),
// ❌ Нет GIN индекса для поиска внутри JSON
```

**Fix:**
```typescript
(table) => [
  index("calls_metadata_gin_idx").using("gin", table.metadata),
]
```

#### ⚠️ Warning: Отсутствие read replicas strategy

**Recommendation:**
- Разделить read/write операции
- Использовать read replicas для отчетов и аналитики
- Добавить connection pooling (PgBouncer)

---

### 6. Data Modeling Issues

#### ❌ Problem: User settings разбиты слишком мелко

**Текущая структура:**
- `user_notification_settings`
- `user_report_settings`
- `user_kpi_settings`
- `user_filter_settings`

**Проблема:**
- 4 дополнительных JOIN для получения полных настроек пользователя
- Сложность в поддержке транзакций
- Overhead на уровне БД

**Better Approach:**
```typescript
// user-workspace-settings.ts
export const userWorkspaceSettings = pgTable("user_workspace_settings", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  
  // Все настройки в одной таблице с JSONB для гибкости
  notificationSettings: jsonb("notification_settings")
    .$type<NotificationSettings>()
    .notNull(),
  reportSettings: jsonb("report_settings")
    .$type<ReportSettings>()
    .notNull(),
  kpiSettings: jsonb("kpi_settings")
    .$type<KpiSettings>()
    .notNull(),
  filterSettings: jsonb("filter_settings")
    .$type<FilterSettings>()
    .notNull(),
  
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  unique("user_workspace_settings_unique").on(
    table.userId,
    table.workspaceId
  ),
  index("user_workspace_settings_workspace_idx").on(table.workspaceId),
  index("user_workspace_settings_user_idx").on(table.userId),
]);
```

**Преимущества:**
- 1 JOIN вместо 4
- Атомарные обновления
- Гибкость через JSONB
- Лучшая производительность

#### ⚠️ Warning: Нет версионирования схемы

**Recommendation:**
```typescript
// schema-version.ts
export const schemaVersion = pgTable("schema_version", {
  version: integer("version").primaryKey(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  description: text("description").notNull(),
});
```

---

### 7. Missing Tables for Production SaaS

#### ❌ Missing: Billing & Subscriptions
```typescript
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  plan: text("plan").notNull(), // 'free', 'pro', 'enterprise'
  status: text("status").notNull(), // 'active', 'canceled', 'past_due'
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
```

#### ❌ Missing: Usage tracking
```typescript
export const usageMetrics = pgTable("usage_metrics", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  metricType: text("metric_type").notNull(), // 'calls', 'storage', 'api_requests'
  value: integer("value").notNull(),
  period: text("period").notNull(), // '2024-01'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("usage_metrics_workspace_type_period").on(
    table.workspaceId,
    table.metricType,
    table.period
  ),
  index("usage_metrics_workspace_period_idx").on(
    table.workspaceId,
    table.period
  ),
]);
```

#### ❌ Missing: Feature flags
```typescript
export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  key: text("key").notNull().unique(),
  enabled: boolean("enabled").default(false).notNull(),
  workspaceIds: jsonb("workspace_ids").$type<string[]>(), // null = all workspaces
  rolloutPercentage: integer("rollout_percentage").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
```

#### ❌ Missing: Invitations
```typescript
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: workspaceMemberRole("role").notNull(),
  token: text("token").notNull().unique(),
  invitedBy: text("invited_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("invitations_workspace_idx").on(table.workspaceId),
  index("invitations_email_idx").on(table.email),
  index("invitations_token_idx").on(table.token),
]);
```

---

## Priority Action Items

### P0 (Critical - Fix Immediately)
1. ✅ Добавить `workspaceId` во все user-settings таблицы
2. ✅ Добавить индексы на user-settings
3. ✅ Реализовать RLS для tenant isolation
4. ✅ Добавить audit trail
5. ✅ Добавить check constraints для валидации

### P1 (High - Fix This Sprint)
1. ✅ Объединить user-settings в одну таблицу с JSONB
2. ✅ Добавить партиционирование для calls
3. ✅ Добавить billing & subscriptions таблицы
4. ✅ Добавить usage tracking
5. ✅ Добавить invitations таблицу

### P2 (Medium - Plan for Next Sprint)
1. ⚠️ Реализовать архивацию старых данных
2. ⚠️ Добавить feature flags
3. ⚠️ Настроить read replicas
4. ⚠️ Добавить шифрование sensitive data
5. ⚠️ Добавить schema versioning

### P3 (Low - Nice to Have)
1. 📝 Добавить materialized views для аналитики
2. 📝 Настроить connection pooling
3. 📝 Добавить full-text search индексы
4. 📝 Реализовать soft delete для всех таблиц
5. 📝 Добавить rate limiting на уровне БД

---

## Recommended Schema Changes

Хочешь, чтобы я создал исправленные версии схем с учетом всех рекомендаций?
