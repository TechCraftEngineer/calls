/**
 * Hono handler для Inngest.
 * Используется в packages/jobs/src/server.ts.
 */

import { serve } from "inngest/hono";
import { inngest } from "./inngest/client";
import { emailReportsFn } from "./inngest/functions/email-reports";
import { evaluateCallFn } from "./inngest/functions/evaluate-call";
import { megafonSyncFn } from "./inngest/functions/megafon-sync";
import { pbxSyncFn } from "./inngest/functions/pbx-sync";
import { telegramReportsFn } from "./inngest/functions/telegram-reports";
import { transcribeCallFn } from "./inngest/functions/transcribe-call";

export const inngestHandler = serve({
  client: inngest,
  functions: [
    megafonSyncFn,
    pbxSyncFn,
    transcribeCallFn,
    evaluateCallFn,
    telegramReportsFn,
    emailReportsFn,
  ],
});
