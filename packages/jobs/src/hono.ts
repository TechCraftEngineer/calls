/**
 * Hono handler для Inngest.
 * Импортировать в app-server: import { inngestHandler } from "@calls/jobs/hono";
 */

import { serve } from "inngest/hono";
import { inngest } from "./inngest/client";
import { megafonSyncFn } from "./inngest/functions/megafon-sync";

export const inngestHandler = serve({
  client: inngest,
  functions: [megafonSyncFn],
});
