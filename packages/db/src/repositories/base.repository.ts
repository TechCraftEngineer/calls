/**
 * Base repository with common database operations
 */

import type { Table } from "drizzle-orm";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../client";

export abstract class BaseRepository<T extends Table> {
  constructor(protected table: T) {}

  async findById(id: string | number): Promise<T["$inferSelect"] | null> {
    // This method should be overridden in child classes due to type differences
    throw new Error("findById must be implemented in child repository");
  }

  protected async create(data: Partial<T["$inferInsert"]>): Promise<number> {
    const result = await db
      .insert(this.table)
      .values(data)
      .returning({ id: (this.table as any).id });
    return result[0]?.id ?? 0;
  }

  protected async update(
    id: number,
    data: Partial<T["$inferInsert"]>,
  ): Promise<boolean> {
    const result = await db
      .update(this.table)
      .set(data)
      .where(eq((this.table as any).id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async delete(id: string | number): Promise<boolean> {
    const result = await db
      .delete(this.table)
      .where(eq((this.table as any).id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async softDelete(id: string | number): Promise<boolean> {
    const result = await db
      .update(this.table)
      .set({ is_active: false } as Partial<T["$inferInsert"]>)
      .where(eq((this.table as any).id, id));
    return (result.rowCount ?? 0) > 0;
  }
}
