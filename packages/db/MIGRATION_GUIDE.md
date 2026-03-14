# Database Migration Guide

## Overview

This guide covers the migration from the old user settings structure to the new consolidated SaaS-ready schema.

## Changes Summary

### 1. User Settings Consolidation

**Old Structure (4 tables):**
- `user_notification_settings`
- `user_report_settings`
- `user_kpi_settings`
- `user_filter_settings`

**New Structure (1 table):**
- `user_workspace_settings` - All settings in one table with workspace isolation

### 2. New SaaS Tables

- `subscriptions` - Billing and plan management
- `usage_metrics` - Usage tracking per workspace
- `invoices` - Invoice history
- `invitations` - Workspace member invitations
- `audit_log` - Comprehensive audit trail
- `feature_flags` - Feature flag management

### 3. Security Improvements

- Row Level Security (RLS) policies for all tables
- Encrypted sensitive fields (tokens, credentials)
- Check constraints for data validation
- Unique constraints for data integrity

### 4. Performance Improvements

- Composite indexes for common queries
- GIN indexes for JSONB fields
- Archiving support for old data
- Optimized UUID generation (gen_random_uuid)

## Migration Steps

### Step 1: Apply New Schema

```bash
# Enable extensions and add UUIDv7 function
psql $DATABASE_URL < packages/db/src/migrations/001_add_uuidv7_function.sql

# Run migrations to create new tables
npm run db:migrate
```

### Step 2: Migrate User Settings Data

```sql
-- Migrate user settings to new consolidated table
INSERT INTO user_workspace_settings (
  user_id,
  workspace_id,
  notification_settings,
  report_settings,
  kpi_settings,
  filter_settings
)
SELECT 
  uns.user_id,
  wm.workspace_id,
  jsonb_build_object(
    'email', jsonb_build_object(
      'dailyReport', COALESCE(uns.email_daily_report, false),
      'weeklyReport', COALESCE(uns.email_weekly_report, false),
      'monthlyReport', COALESCE(uns.email_monthly_report, false)
    ),
    'telegram', jsonb_build_object(
      'dailyReport', COALESCE(uns.telegram_daily_report, false),
      'managerReport', COALESCE(uns.telegram_manager_report, false),
      'weeklyReport', COALESCE(uns.telegram_weekly_report, false),
      'monthlyReport', COALESCE(uns.telegram_monthly_report, false),
      'skipWeekends', COALESCE(uns.telegram_skip_weekends, false),
      'connectToken', uns.telegram_connect_token
    ),
    'max', jsonb_build_object(
      'chatId', uns.max_chat_id,
      'dailyReport', COALESCE(uns.max_daily_report, false),
      'managerReport', COALESCE(uns.max_manager_report, false),
      'connectToken', uns.max_connect_token
    )
  ) as notification_settings,
  jsonb_build_object(
    'includeCallSummaries', COALESCE(urs.include_call_summaries, false),
    'detailed', COALESCE(urs.detailed, false),
    'includeAvgValue', COALESCE(urs.include_avg_value, false),
    'includeAvgRating', COALESCE(urs.include_avg_rating, false),
    'managedUserIds', COALESCE(
      (SELECT jsonb_agg(value) FROM jsonb_array_elements_text(urs.managed_user_ids::jsonb)),
      '[]'::jsonb
    )
  ) as report_settings,
  jsonb_build_object(
    'baseSalary', COALESCE(uks.base_salary, 0),
    'targetBonus', COALESCE(uks.target_bonus, 0),
    'targetTalkTimeMinutes', COALESCE(uks.target_talk_time_minutes, 0)
  ) as kpi_settings,
  jsonb_build_object(
    'excludeAnsweringMachine', COALESCE(ufs.exclude_answering_machine, false),
    'minDuration', COALESCE(ufs.min_duration, 0),
    'minReplicas', COALESCE(ufs.min_replicas, 0)
  ) as filter_settings
FROM user_notification_settings uns
CROSS JOIN workspace_members wm
LEFT JOIN user_report_settings urs ON urs.user_id = uns.user_id
LEFT JOIN user_kpi_settings uks ON uks.user_id = uns.user_id
LEFT JOIN user_filter_settings ufs ON ufs.user_id = uns.user_id
WHERE wm.user_id = uns.user_id
ON CONFLICT (user_id, workspace_id) DO NOTHING;
```

### Step 3: Encrypt Sensitive Data

```typescript
// Run encryption script for existing tokens
import { encrypt } from './utils/encryption';
import { db } from './client';
import { account } from './schema/auth/account';

async function encryptExistingTokens() {
  const accounts = await db.select().from(account);
  
  for (const acc of accounts) {
    const updates: any = {};
    
    if (acc.accessToken) {
      updates.accessToken = encrypt(acc.accessToken);
    }
    if (acc.refreshToken) {
      updates.refreshToken = encrypt(acc.refreshToken);
    }
    if (acc.idToken) {
      updates.idToken = encrypt(acc.idToken);
    }
    
    if (Object.keys(updates).length > 0) {
      await db.update(account)
        .set(updates)
        .where(eq(account.id, acc.id));
    }
  }
}
```

### Step 4: Create Default Subscriptions

```sql
-- Create free plan subscription for all existing workspaces
INSERT INTO subscriptions (
  workspace_id,
  plan,
  status,
  current_period_start,
  current_period_end,
  limits
)
SELECT 
  id as workspace_id,
  'free'::subscription_plan as plan,
  'active'::subscription_status as status,
  NOW() as current_period_start,
  NOW() + INTERVAL '1 year' as current_period_end,
  jsonb_build_object(
    'maxCalls', 1000,
    'maxStorageGb', 10,
    'maxUsers', 5,
    'maxApiRequests', 10000
  ) as limits
FROM workspaces
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions WHERE subscriptions.workspace_id = workspaces.id
);
```

### Step 5: Verify Migration

```sql
-- Check user settings migration
SELECT 
  COUNT(*) as total_settings,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT workspace_id) as unique_workspaces
FROM user_workspace_settings;

-- Check subscriptions
SELECT plan, status, COUNT(*) 
FROM subscriptions 
GROUP BY plan, status;
```

### Step 6: Drop Old Tables (After Verification)

```sql
-- Only after confirming migration success
DROP TABLE IF EXISTS user_notification_settings CASCADE;
DROP TABLE IF EXISTS user_report_settings CASCADE;
DROP TABLE IF EXISTS user_kpi_settings CASCADE;
DROP TABLE IF EXISTS user_filter_settings CASCADE;
```

## Environment Variables

Add these to your `.env`:

```bash
# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Stripe (for billing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Application Code Updates

### 1. Update Imports

```typescript
// Old
import { userNotificationSettings } from '@/db/schema';

// New
import { userWorkspaceSettings } from '@/db/schema';
```

### 2. Update Queries

```typescript
// Old
const settings = await db
  .select()
  .from(userNotificationSettings)
  .where(eq(userNotificationSettings.userId, userId));

// New - Always filter by workspaceId for tenant isolation
const settings = await db
  .select()
  .from(userWorkspaceSettings)
  .where(
    and(
      eq(userWorkspaceSettings.userId, userId),
      eq(userWorkspaceSettings.workspaceId, workspaceId)
    )
  );
```

### 3. Workspace Isolation Middleware

```typescript
// Middleware to ensure workspace isolation
export async function withWorkspaceIsolation(
  userId: string,
  workspaceId: string,
  callback: () => Promise<any>
) {
  // Verify user has access to workspace
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
    throw new Error('Access denied to workspace');
  }

  return callback();
}
```

### 4. Use Encryption Utilities

```typescript
import { encrypt, decrypt, encryptFields, decryptFields } from '@/db/utils/encryption';

// Encrypt before saving
const encryptedToken = encrypt(token);
await db.insert(account).values({
  ...data,
  accessToken: encryptedToken,
});

// Decrypt after reading
const account = await db.select().from(account).where(...);
const decryptedToken = decrypt(account.accessToken);
```

## Rollback Plan

If issues occur during migration:

```sql
-- 1. Restore old tables from backup
pg_restore -d dbname backup.dump

-- 2. Drop new tables
DROP TABLE IF EXISTS user_workspace_settings CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS usage_metrics CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS feature_flags CASCADE;
```

## Testing Checklist

- [ ] All user settings migrated correctly
- [ ] Workspace isolation working (users can only see their workspace data)
- [ ] Encryption/decryption working for sensitive fields
- [ ] Subscriptions created for all workspaces
- [ ] Audit log capturing all changes
- [ ] Feature flags working
- [ ] Invitations flow working
- [ ] Performance acceptable (check query plans)
- [ ] Backup and restore tested

## Support

For issues during migration, check:
1. Database logs for errors
2. Application logs for access violations
3. Encryption key is set correctly
4. All indexes created successfully
5. Workspace isolation middleware working

## Timeline

Recommended migration timeline:
- Day 1: Apply new schema in staging
- Day 2-3: Test thoroughly in staging
- Day 4: Migrate production during low-traffic window
- Day 5-7: Monitor and verify
- Day 8+: Drop old tables after confirmation
