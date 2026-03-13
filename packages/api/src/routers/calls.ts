import { z } from "zod";
import { adminProcedure, protectedProcedure } from "../orpc";

const listCallsSchema = z.object({
  page: z.number().min(1).default(1),
  per_page: z.number().min(1).max(100).default(15),
  q: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  direction: z.string().optional(),
  manager: z.string().optional(),
  status: z.string().optional(),
  value: z.array(z.number()).optional(),
  operator: z.array(z.string()).optional(),
});

export const callsRouter = {
  list: protectedProcedure
    .input(listCallsSchema)
    .handler(async ({ input, context }) => {
      const { storage, user } = context;
      const offset = (input.page - 1) * input.per_page;

      // TODO: Implement full filtering (internal_numbers, mobile_numbers, manager, status, q search)
      // For now simplified version
      const dateFrom = input.date_from
        ? `${input.date_from}T00:00:00`
        : undefined;
      const dateTo = input.date_to ? `${input.date_to}T23:59:59` : undefined;

      const internalNumbers = getInternalNumbersForUser(user!, storage);
      const mobileNumbers = getMobileNumbersForUser(user!, storage);

      const callsWithTranscripts = storage.getCallsWithTranscripts({
        limit: input.per_page,
        offset,
        dateFrom,
        dateTo,
        internalNumbers,
        mobileNumbers,
        direction:
          input.direction === "incoming" || input.direction === "Входящий"
            ? "Входящий"
            : input.direction === "outgoing" || input.direction === "Исходящий"
              ? "Исходящий"
              : undefined,
        valueScores: input.value?.length ? input.value : undefined,
        operators: input.operator?.length ? input.operator : undefined,
      });

      const totalItems = storage.countCalls({
        dateFrom,
        dateTo,
        internalNumbers,
        mobileNumbers,
        direction:
          input.direction === "incoming" || input.direction === "Входящий"
            ? "Входящий"
            : input.direction === "outgoing" || input.direction === "Исходящий"
              ? "Исходящий"
              : undefined,
        valueScores: input.value?.length ? input.value : undefined,
        operators: input.operator?.length ? input.operator : undefined,
      });

      const totalPages = Math.ceil(totalItems / input.per_page) || 1;
      const metrics = storage.calculateMetrics();
      const managers = storage
        .getAllUsers()
        .filter((u) => (u as Record<string, unknown>).internal_numbers);

      return {
        calls: callsWithTranscripts,
        pagination: {
          page: input.page,
          total: totalItems,
          per_page: input.per_page,
          total_pages: totalPages,
          has_next: input.page < totalPages,
          has_prev: input.page > 1,
          next_num: input.page + 1,
          prev_num: input.page - 1,
          query: input.q ?? "",
          date_from: input.date_from ?? "",
          date_to: input.date_to ?? "",
          direction: input.direction ?? "all",
          status: input.status ?? "all",
          manager: input.manager ?? "",
          value: input.value ?? [],
          operator: input.operator ?? [],
        },
        metrics: {
          total_calls: totalItems,
          transcribed: metrics.transcribed,
          avg_duration: metrics.avg_duration,
          last_sync: metrics.last_sync,
        },
        managers,
      };
    }),

  get: protectedProcedure
    .input(z.object({ call_id: z.number() }))
    .handler(async ({ input, context }) => {
      const call = context.storage.getCall(input.call_id);
      if (!call) {
        throw new Error("Call not found");
      }
      const transcript = context.storage.getTranscriptByCallId(input.call_id);
      const evaluation = context.storage.getEvaluation(input.call_id);
      // TODO: Add operator_name, duration_seconds, duration_formatted
      return { call, transcript, evaluation };
    }),

  generateRecommendations: protectedProcedure
    .input(z.object({ call_id: z.number() }))
    .handler(async ({ input }) => {
      // TODO: Integrate DeepSeek service for recommendations
      throw new Error(
        "generateRecommendations not yet implemented - integrate DeepSeek",
      );
    }),

  delete: adminProcedure
    .input(z.object({ call_id: z.number() }))
    .handler(async ({ input, context }) => {
      const call = context.storage.getCall(input.call_id);
      if (!call) throw new Error("Call not found");
      if (!context.storage.deleteCall(input.call_id))
        throw new Error("Failed to delete call");
      context.storage.addActivityLog(
        "info",
        `Deleted call #${input.call_id}`,
        (context.user as Record<string, unknown>).username as string,
      );
      return { success: true, message: `Call #${input.call_id} deleted` };
    }),
};

function getInternalNumbersForUser(
  user: Record<string, unknown>,
  storage: typeof import("@calls/backend-storage").storage,
): string[] | undefined {
  const nums = user.internal_numbers as string | undefined;
  if (!nums || String(nums).trim().toLowerCase() === "all") return undefined;
  const adminUsernames = ["admin@mango", "admin@gmail.com"];
  if (adminUsernames.includes((user.username as string) ?? ""))
    return undefined;
  return (
    nums
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) || undefined
  );
}

function getMobileNumbersForUser(
  user: Record<string, unknown>,
  _storage: typeof import("@calls/backend-storage").storage,
): string[] | undefined {
  const nums = user.mobile_numbers as string | undefined;
  if (!nums?.trim()) return undefined;
  return (
    nums
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) || undefined
  );
}
