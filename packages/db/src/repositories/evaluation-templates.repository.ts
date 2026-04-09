/**
 * Evaluation templates repository - CRUD for custom evaluation templates
 */

import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../client";
import * as schema from "../schema";

// Built-in evaluation template slugs (defined locally to avoid dependency on @calls/shared)
const BUILTIN_SLUGS = ["sales", "support", "general"] as const;

export const evaluationTemplatesRepository = {
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(schema.evaluationTemplates)
      .where(eq(schema.evaluationTemplates.workspaceId, workspaceId))
      .orderBy(asc(schema.evaluationTemplates.name));
  },

  async findByWorkspaceAndSlug(
    workspaceId: string,
    slug: string,
  ): Promise<schema.EvaluationTemplate | null> {
    const result = await db
      .select()
      .from(schema.evaluationTemplates)
      .where(
        and(
          eq(schema.evaluationTemplates.workspaceId, workspaceId),
          eq(schema.evaluationTemplates.slug, slug),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  },

  async findById(id: string, workspaceId: string): Promise<schema.EvaluationTemplate | null> {
    const result = await db
      .select()
      .from(schema.evaluationTemplates)
      .where(
        and(
          eq(schema.evaluationTemplates.id, id),
          eq(schema.evaluationTemplates.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    return result[0] ?? null;
  },

  async create(
    workspaceId: string,
    data: {
      slug: string;
      name: string;
      description?: string | null;
      systemPrompt: string;
    },
  ): Promise<schema.EvaluationTemplate> {
    const [row] = await db
      .insert(schema.evaluationTemplates)
      .values({
        workspaceId,
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        systemPrompt: data.systemPrompt,
      })
      .returning();
    if (!row) throw new Error("Failed to create evaluation template");
    return row;
  },

  async update(
    id: string,
    workspaceId: string,
    data: {
      slug?: string;
      name?: string;
      description?: string | null;
      systemPrompt?: string;
    },
  ): Promise<boolean> {
    const result = await db
      .update(schema.evaluationTemplates)
      .set({
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.systemPrompt !== undefined && {
          systemPrompt: data.systemPrompt,
        }),
      })
      .where(
        and(
          eq(schema.evaluationTemplates.id, id),
          eq(schema.evaluationTemplates.workspaceId, workspaceId),
        ),
      );
    return (result.rowCount ?? 0) > 0;
  },

  async delete(id: string, workspaceId: string): Promise<boolean> {
    const result = await db
      .delete(schema.evaluationTemplates)
      .where(
        and(
          eq(schema.evaluationTemplates.id, id),
          eq(schema.evaluationTemplates.workspaceId, workspaceId),
        ),
      );
    return (result.rowCount ?? 0) > 0;
  },

  isBuiltinSlug(slug: string): slug is (typeof BUILTIN_SLUGS)[number] {
    return (BUILTIN_SLUGS as readonly string[]).includes(slug);
  },

  generateCustomSlug(): string {
    return `t_${randomBytes(8).toString("base64url").slice(0, 12)}`;
  },
};

export type EvaluationTemplatesRepository = typeof evaluationTemplatesRepository;
