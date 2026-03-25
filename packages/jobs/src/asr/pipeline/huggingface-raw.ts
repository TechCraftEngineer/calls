import { z } from "zod";

const huggingFaceRawSchema = z.object({
  model: z.string().optional(),
  revision: z.string().optional(),
});

export function parseHuggingFaceRaw(
  raw: unknown,
): { model?: string; revision?: string } | null {
  const parsed = huggingFaceRawSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}
