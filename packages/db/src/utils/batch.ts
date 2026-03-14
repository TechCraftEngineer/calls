/**
 * Batch operations utilities for efficient bulk inserts/updates
 */

import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "../client";

/**
 * Insert records in batches to avoid memory issues and improve performance
 * @param table - Drizzle table to insert into
 * @param records - Array of records to insert
 * @param batchSize - Number of records per batch (default: 1000)
 */
export async function batchInsert<T extends PgTable>(
  table: T,
  records: Array<T["$inferInsert"]>,
  batchSize = 1000,
): Promise<void> {
  if (records.length === 0) return;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await db.insert(table).values(batch);
  }
}

/**
 * Insert records in batches within a transaction
 * @param table - Drizzle table to insert into
 * @param records - Array of records to insert
 * @param batchSize - Number of records per batch (default: 1000)
 */
export async function batchInsertTransaction<T extends PgTable>(
  table: T,
  records: Array<T["$inferInsert"]>,
  batchSize = 1000,
): Promise<void> {
  if (records.length === 0) return;

  await db.transaction(async (tx) => {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await tx.insert(table).values(batch);
    }
  });
}
