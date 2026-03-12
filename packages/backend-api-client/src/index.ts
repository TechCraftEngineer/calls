/**
 * Browser-safe oRPC client for backend-api.
 * No server dependencies (no backend-storage, better-sqlite3).
 */

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

/**
 * Creates an oRPC client for the backend API.
 * Use in frontend / browser only.
 */
export function createBackendClient(baseUrl: string) {
  const url = baseUrl.replace(/\/?$/, "") + "/api/orpc";
  const link = new RPCLink({ url });
  return createORPCClient(link);
}
