/**
 * Billing domain schema - subscriptions, plans, and usage tracking
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

// Enums
export const subscriptionPlan = pgEnum("subscription_plan", [
  "free",
  "starter",
  "pro",
  "enterprise",
]);

export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
]);

// Subscriptions table
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .unique()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    plan: subscriptionPlan("plan").notNull().default("free"),
    status: subscriptionStatus("status").notNull().default("active"),

    // Billing period
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    canceledAt: timestamp("canceled_at"),

    // Trial
    trialStart: timestamp("trial_start"),
    trialEnd: timestamp("trial_end"),

    // Stripe integration (encrypted)
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripePaymentMethodId: text("stripe_payment_method_id"),

    // Plan limits
    limits: jsonb("limits").$type<{
      maxCalls: number;
      maxStorageGb: number;
      maxUsers: number;
      maxApiRequests: number;
    }>(),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("subscriptions_workspace_idx").on(table.workspaceId),
    index("subscriptions_status_idx").on(table.status),
    index("subscriptions_stripe_customer_idx").on(table.stripeCustomerId),
    index("subscriptions_stripe_subscription_idx").on(
      table.stripeSubscriptionId,
    ),
  ],
);

// Usage metrics table
export const usageMetrics = pgTable(
  "usage_metrics",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    metricType: text("metric_type").notNull(), // 'calls', 'storage_gb', 'api_requests', 'users'
    value: integer("value").notNull(),
    period: text("period").notNull(), // 'YYYY-MM' format

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("usage_metrics_workspace_type_period_unique").on(
      table.workspaceId,
      table.metricType,
      table.period,
    ),
    index("usage_metrics_workspace_idx").on(table.workspaceId),
    index("usage_metrics_workspace_period_idx").on(
      table.workspaceId,
      table.period,
    ),
    index("usage_metrics_period_idx").on(table.period),
  ],
);

// Invoices table
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),

    stripeInvoiceId: text("stripe_invoice_id").unique(),
    status: text("status").notNull(), // 'draft', 'open', 'paid', 'void', 'uncollectible'

    amountDue: integer("amount_due").notNull(),
    amountPaid: integer("amount_paid").notNull(),
    currency: text("currency").notNull().default("usd"),

    invoiceNumber: text("invoice_number"),
    invoicePdf: text("invoice_pdf"),

    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    dueDate: timestamp("due_date"),
    paidAt: timestamp("paid_at"),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("invoices_workspace_idx").on(table.workspaceId),
    index("invoices_stripe_invoice_idx").on(table.stripeInvoiceId),
    index("invoices_status_idx").on(table.status),
    index("invoices_period_idx").on(table.periodStart, table.periodEnd),
  ],
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type UsageMetric = typeof usageMetrics.$inferSelect;
export type NewUsageMetric = typeof usageMetrics.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
