/**
 * Base repository with common database operations
 */

import { db } from "../client";
import { eq, and, desc, asc } from "drizzle-orm";
import type { Table } from "drizzle-orm";

export abstract class BaseRepository<T extends Table> {
  constructor(protected table: T) {}

  protected async findById(id: number): Promise<any | null> {
    const result = await db
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);
    return result[0] ?? null;
  }

  protected async create(data: Partial<any>): Promise<number> {
    const result = await db
      .insert(this.table)
      .values(data as any)
      .returning({ id: (this.table as any).id });
    return result[0]?.id ?? 0;
  }

  protected async update(id: number, data: Partial<any>): Promise<boolean> {
    const result = await db
      .update(this.table)
      .set(data as any)
      .where(eq((this.table as any).id, id));
    return (result.rowCount ?? 0) > 0;
  }

  protected async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(this.table)
      .where(eq((this.table as any).id, id));
    return (result.rowCount ?? 0) > 0;
  }

  protected async softDelete(id: number): Promise<boolean> {
    const result = await db
      .update(this.table)
      .set({ is_active: false } as any)
      .where(eq((this.table as any).id, id));
    return (result.rowCount ?? 0) > 0;
  }
}
