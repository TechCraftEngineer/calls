/**
 * System repository - handles activity logs and other system operations
 */

import { desc } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";

export class SystemRepository {
  async addActivityLog(
    level: string,
    message: string,
    actor: string,
    workspaceId?: number | null,
  ): Promise<void> {
    const values: any = {
      timestamp: new Date(),
      level,
      message,
      actor,
    };

    if (workspaceId) {
      values.workspaceId = workspaceId;
    }

    await db.insert(schema.activityLog).values(values);
  }

  async getLastActivity(): Promise<{ timestamp: Date | null }> {
    const result = await db
      .select({ timestamp: schema.activityLog.timestamp })
      .from(schema.activityLog)
      .orderBy(desc(schema.activityLog.timestamp))
      .limit(1);

    return { timestamp: result[0]?.timestamp ?? null };
  }
}
