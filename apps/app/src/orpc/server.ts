import "server-only";

import { appRouter } from "@calls/api";
import { createContext } from "@calls/api/orpc";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { dehydrate } from "@tanstack/react-query";
import { headers } from "next/headers";
import { cache } from "react";

// Auth опционален; при отсутствии createBackendContext использует cookie fallback
import { createQueryClient } from "./query-client";

const createServerContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-orpc-source", "rsc");
  return createContext({ headers: heads });
});
/**
 * This is part of the Optimize SSR setup.
 *
 * @see {@link https://orpc.dev/docs/adapters/next#optimize-ssr}
 */
globalThis.$client = createRouterClient(appRouter, {
  /**
   * Context is provided per-request through the router's middleware.
   * No initial context needed for SSR optimization.
   */
  context: createServerContext,
});

export const api = globalThis.$client;

const getClient = () => {
  const client = globalThis.$client;
  if (!client) throw new Error("oRPC client not initialized");
  return client;
};

export const orpc = createTanstackQueryUtils(getClient());

/**
 * Создаёт server helpers для prefetch и гидратации.
 * Используется в серверных компонентах для загрузки данных на сервере.
 */
export async function createServerHelpers() {
  const queryClient = createQueryClient();
  const orpc = createTanstackQueryUtils(getClient());

  return {
    queryClient,
    /** Prefetch данные для передачи клиенту через dehydrate */
    prefetch: {
      workspaces: {
        list: {
          prefetch: () => queryClient.prefetchQuery(orpc.workspaces.list.queryOptions()),
        },
      },
      users: {
        list: {
          prefetch: () => queryClient.prefetchQuery(orpc.users.list.queryOptions()),
        },
      },
    },
    /** Состояние для HydrationBoundary */
    dehydrate: () => dehydrate(queryClient),
  };
}

export { HydrateClient } from "./hydrate-client";

export { createQueryClient as makeQueryClient } from "./query-client";
