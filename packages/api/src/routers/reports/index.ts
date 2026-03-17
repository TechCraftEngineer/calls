import type { AnyProcedure } from "@orpc/server";
import { sendTestEmail } from "./send-test-email";
import { sendTestTelegram } from "./send-test-telegram";

export const reportsRouter = {
  sendTestEmail,
  sendTestTelegram,
} satisfies Record<string, AnyProcedure>;
