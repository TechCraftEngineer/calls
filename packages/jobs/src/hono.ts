/**
 * Hono handler для Inngest.
 * Импортировать в app-server: import { inngestHandler } from "@calls/jobs/hono";
 */

import { serve } from "inngest/hono";
import { inngest } from "./inngest/client";
import { megafonSyncFn } from "./inngest/functions/megafon-sync";
import { transcribeCallFn } from "./inngest/functions/transcribe-call";

export const inngestHandler = serve({
  client: inngest,
  functions: [megafonSyncFn, transcribeCallFn],
});
