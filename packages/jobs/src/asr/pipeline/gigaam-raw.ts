import { z } from "zod";

const gigaAmRawSchema = z.object({
  endpoint: z.string().optional(),
  totalDuration: z.number().optional(),
  segmentCount: z.number().optional(),
});

export function parseGigaAmRaw(
  raw: unknown,
): { endpoint?: string; totalDuration?: number; segmentCount?: number } | null {
  const parsed = gigaAmRawSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}
