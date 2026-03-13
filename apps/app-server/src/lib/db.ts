/**
 * Database utilities.
 */

import { createLogger } from "@calls/api";
import { sql } from "drizzle-orm";

const logger = createLogger("backend-server");

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { db } = await import("@calls/db/client");
    await db.execute(sql`SELECT 1`);
    logger.info("Database connection check passed");
    return true;
  } catch (error) {
    logger.error("Database connection check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
