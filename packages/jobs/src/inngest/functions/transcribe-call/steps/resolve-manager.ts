/**
 * Определение менеджера по данным из PBX
 */

import { resolveManagerFromPbx as resolveFromPbx } from "../manager-resolution";
import type { Call } from "../schemas";

export async function resolveManager(call: Call): Promise<string | null> {
  return resolveFromPbx(call);
}
