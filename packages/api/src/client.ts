/**
 * Typed oRPC client for backend-api.
 * Use this as the main API client for the project.
 */

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { BackendRouter } from "./orpc-root";

export type BackendApiClient = ReturnType<typeof createBackendClient>;

/**
 * Creates a typed oRPC client for the backend API.
 * Use for frontend and other HTTP consumers.
 *
 * @param baseUrl - API base URL (e.g. http://localhost:7000)
 */
export function createBackendClient(baseUrl: string) {
  const url = `${baseUrl.replace(/\/?$/, "")}/api/orpc`;
  const link = new RPCLink({ url });
  return createORPCClient(link) as ReturnType<typeof createORPCClient> &
    BackendRouter;
}
