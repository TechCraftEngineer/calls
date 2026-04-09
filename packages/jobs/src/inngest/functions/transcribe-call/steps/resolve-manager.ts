/**
 * Определение менеджера по данным из PBX
 */

import { resolveManagerFromPbx as resolveFromPbx } from "~/inngest/functions/transcribe-call/manager";
import type { Call } from "~/inngest/functions/transcribe-call/schemas";

export async function resolveManager(call: Call): Promise<string | null> {
  return resolveFromPbx(call);
}
