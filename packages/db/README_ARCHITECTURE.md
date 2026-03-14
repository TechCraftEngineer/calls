# Database Architecture Documentation

## Overview

This database is designed for a multi-tenant SaaS application with enterprise-grade security, scalability, and compliance features.

## Core Principles

1. **Multi-Tenancy**: Workspace-based isolation at application level
2. **Security First**: Encryption, audit trails, workspace access control
3. **Scalability**: UUIDv7 for time-ordered IDs, partitioning, efficient indexes
4. **Compliance**: Audit logs, data retention, GDPR-ready

## Schema Organization

### Authentication (`auth/`)
- `users` - User accounts (Better Auth compatible)
- `accounts` - OAuth/credential accounts (encrypted tokens)
- `sessions` - User sessions
- `verifications` - Email/phone verifications

### Core Domain
- `workspaces` - Tenant isolation boundary
- `workspace_members` - User-workspace relationships with roles
- `user_preferences` - User UI preferences
- `user_workspace_settings` - Per-workspace user settings (consolidated)

### Business Domain
- `calls` - Call recordings metadata
- `transcripts` - Call transcriptions
- `call_evaluations` - Quality scores and feedback
- `files` - File storage metadata (S3 references)

### SaaS Features
- `subscriptions` - Billing plans and status
- `usage_metrics` - Usage tracking for billing
- `invoices` - Invoice history
- `invitations` - Workspace member invitations
- `feature_flags` - Feature rollout control
- `audit_log` - Comprehensive audit trail

### System
- `prompts` - AI prompts configuration
- `activity_log` - System events log

## Security Architecture

### Workspace Isolation

Tenant isolation is enforced at the application level through middleware and query filters.

**Application-Level Isolation:**

```typescript
// Middleware example
export async function requireWorkspaceAccess(
  userId: string,
  workspaceId: string
) {
  const member = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!member.length) {
    throw new Error('Access denied');
  }

  return member[0];
}

// Always filter by workspaceId
const calls = await db
  .select()
  .from(calls)
  .where(
    and(
      eq(calls.workspaceId, workspaceId),
      eq(calls.status, 'completed')
    )
  );
```

### Encryption at Rest

Sensitive fields are encrypted using AES-256-GCM:
- OAuth tokens (access_token, refresh_token, id_token)
- API keys and connect tokens
- Payment method details

```typescript
import { encrypt, decrypt } from '@/db/utils/encryption';

// Encrypt before save
const encrypted = encrypt(sensitiveData);

// Decrypt after read
const decrypted = decrypt(encryptedData);
```

### Audit Trail

All data modifications are logged:

```typescript
await db.insert(auditLog).values({
  workspaceId,
  userId,
  action: 'UPDATE',
  resource: 'call',
  resourceId: callId,
  oldValues: { status: 'pending' },
  newValues: { status: 'completed' },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});
```

## Performance Optimization

### Indexing Strategy

1. **Primary Keys**: UUIDv7 (time-ordered) for better insert performance
2. **Foreign Keys**: Always indexed
3. **Composite Indexes**: For common query patterns
4. **GIN Indexes**: For JSONB fields
5. **Partial Indexes**: For filtered queries

**Why UUIDv7?**
- Time-ordered: Better B-tree index performance
- Sequential inserts: Reduces index fragmentation
- Sortable: Can order by ID to get chronological order
- Distributed-friendly: No coordination needed between servers

```typescript
// UUIDv7 structure:
// [timestamp: 48 bits][random: 74 bits][version: 4 bits][variant: 2 bits]
// Example: 018e7e1a-9e4c-7000-8000-123456789abc
//          └─timestamp─┘ └─random─────────────────┘
```

```typescript
// Example: Composite index for common query
index("calls_workspace_timestamp_idx").on(
  table.workspaceId,
  table.timestamp
)

// GIN index for JSONB search
index("user_workspace_settings_notification_gin_idx")
  .using("gin", table.notificationSettings)
```

### Data Archiving

Old data is archived to prevent table bloat:

```sql
-- Archive calls older than 1 year
UPDATE calls 
SET is_archived = true, archived_at = NOW()
WHERE timestamp < NOW() - INTERVAL '1 year'
  AND is_archived = false;

-- Move to archive table (optional)
INSERT INTO calls_archive 
SELECT * FROM calls WHERE is_archived = true;

DELETE FROM calls WHERE is_archived = true;
```

### Partitioning (Recommended for Scale)

For high-volume tables like `calls`:

```sql
-- Partition by month
CREATE TABLE calls (
  -- columns
) PARTITION BY RANGE (timestamp);

CREATE TABLE calls_2024_01 PARTITION OF calls
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE calls_2024_02 PARTITION OF calls
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

## Multi-Tenancy Implementation

### Workspace Isolation

Every data table includes `workspace_id`:

```typescript
export const calls = pgTable("calls", {
  id: uuid("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  // ... other fields
});
```

### Setting User Context

Workspace isolation is handled in application middleware:

```typescript
// Middleware
export async function workspaceMiddleware(req, res, next) {
  const { workspaceId } = req.params;
  const userId = req.user.id;

  // Verify access
  const member = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!member.length) {
    return res.status(403).json({ error: 'Access denied' });
  }

  req.workspace = { id: workspaceId, role: member[0].role };
  next();
}
```

### Querying with Workspace Filter

Always include workspaceId in queries:

```typescript
// Always filter by workspace
const calls = await db
  .select()
  .from(calls)
  .where(
    and(
      eq(calls.workspaceId, workspaceId),
      eq(calls.status, 'completed')
    )
  );
```

## Billing & Usage Tracking

### Subscription Management

```typescript
// Check workspace limits
const subscription = await db
  .select()
  .from(subscriptions)
  .where(eq(subscriptions.workspaceId, workspaceId));

const limits = subscription.limits;
if (currentUsage.calls >= limits.maxCalls) {
  throw new Error('Call limit exceeded');
}
```

### Usage Tracking

```typescript
// Track usage
await db.insert(usageMetrics).values({
  workspaceId,
  metricType: 'calls',
  value: 1,
  period: '2024-01',
}).onConflictDoUpdate({
  target: [usageMetrics.workspaceId, usageMetrics.metricType, usageMetrics.period],
  set: {
    value: sql`${usageMetrics.value} + 1`,
  },
});
```

## Feature Flags

### Checking Feature Access

```typescript
async function isFeatureEnabled(
  featureKey: string,
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const flag = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, featureKey))
    .limit(1);

  if (!flag || !flag.enabled) return false;

  // Check workspace targeting
  if (flag.workspaceIds && !flag.workspaceIds.includes(workspaceId)) {
    return false;
  }

  // Check user targeting
  if (flag.userIds && !flag.userIds.includes(userId)) {
    return false;
  }

  // Check rollout percentage
  if (flag.rolloutPercentage < 100) {
    const hash = hashString(`${featureKey}:${workspaceId}`);
    return (hash % 100) < flag.rolloutPercentage;
  }

  return true;
}
```

## Data Validation

### Check Constraints

```typescript
// Ensure positive values
duration: integer("duration").$check(sql`duration >= 0`)

// Ensure valid ranges
valueScore: integer("value_score").$check(
  sql`value_score >= 1 AND value_score <= 5`
)

// Ensure percentage range
rolloutPercentage: integer("rollout_percentage").$check(
  sql`rollout_percentage >= 0 AND rollout_percentage <= 100`
)
```

### Unique Constraints

```typescript
// Prevent duplicate workspace members
unique("workspace_members_workspace_user_unique").on(
  table.workspaceId,
  table.userId
)

// Prevent duplicate usage metrics
unique("usage_metrics_workspace_type_period_unique").on(
  table.workspaceId,
  table.metricType,
  table.period
)
```

## Backup & Recovery

### Backup Strategy

1. **Continuous**: WAL archiving for point-in-time recovery
2. **Daily**: Full database backup
3. **Weekly**: Backup verification and restore test
4. **Monthly**: Long-term archive to cold storage

```bash
# Daily backup
pg_dump -Fc $DATABASE_URL > backup_$(date +%Y%m%d).dump

# Restore
pg_restore -d $DATABASE_URL backup_20240101.dump
```

### Data Retention

- Active data: Unlimited
- Archived calls: 7 years
- Audit logs: 7 years (compliance)
- Activity logs: 90 days
- Sessions: 30 days

## Monitoring

### Key Metrics

1. **Query Performance**
   - Slow query log (> 1s)
   - Query plan analysis
   - Index usage statistics

2. **Table Size**
   - Monitor table growth
   - Identify bloat
   - Plan partitioning

3. **Connection Pool**
   - Active connections
   - Wait time
   - Connection errors

### Monitoring Queries

```sql
-- Slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public';
```

## Best Practices

### 1. Always Use Transactions

```typescript
await db.transaction(async (tx) => {
  await tx.insert(calls).values(callData);
  await tx.insert(transcripts).values(transcriptData);
  await tx.insert(auditLog).values(auditData);
});
```

### 2. Set Workspace Context

```typescript
// Middleware
app.use(async (req, res, next) => {
  if (req.user && req.params.workspaceId) {
    await requireWorkspaceAccess(req.user.id, req.params.workspaceId);
    req.workspace = { id: req.params.workspaceId };
  }
  next();
});
```

### 3. Encrypt Sensitive Data

```typescript
// Before insert
const encrypted = encryptFields(data, ['accessToken', 'refreshToken']);
await db.insert(account).values(encrypted);

// After select
const account = await db.select().from(account).where(...);
const decrypted = decryptFields(account, ['accessToken', 'refreshToken']);
```

### 4. Log All Changes

```typescript
// After any mutation
await logAudit({
  workspaceId,
  userId,
  action: 'CREATE',
  resource: 'call',
  resourceId: call.id,
  newValues: call,
});
```

### 5. Check Limits

```typescript
// Before creating resources
await checkUsageLimits(workspaceId, 'calls');
await incrementUsage(workspaceId, 'calls');
```

## Troubleshooting

### Workspace Access Issues

```typescript
// Check if user has access to workspace
const member = await db
  .select()
  .from(workspaceMembers)
  .where(
    and(
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.workspaceId, workspaceId)
    )
  );

console.log('Has access:', member.length > 0);
```

### Performance Issues

```sql
-- Analyze query plan
EXPLAIN ANALYZE
SELECT * FROM calls WHERE workspace_id = '...';

-- Update statistics
ANALYZE calls;

-- Rebuild indexes
REINDEX TABLE calls;
```

### Encryption Issues

```typescript
// Verify encryption key is set
if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY not set');
}

// Test encryption/decryption
const test = 'test data';
const encrypted = encrypt(test);
const decrypted = decrypt(encrypted);
console.assert(test === decrypted);
```

## Future Enhancements

1. **Read Replicas**: Separate read/write traffic
2. **Caching Layer**: Redis for frequently accessed data
3. **Full-Text Search**: PostgreSQL FTS or Elasticsearch
4. **Time-Series Data**: TimescaleDB for metrics
5. **Graph Queries**: For relationship analysis
6. **Materialized Views**: For complex analytics

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/current/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Multi-Tenancy Best Practices](https://www.citusdata.com/blog/2016/10/03/designing-your-saas-database-for-high-scalability/)
- [Database Encryption](https://www.postgresql.org/docs/current/encryption-options.html)
