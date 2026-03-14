"use client";

import type { appRouter } from "@calls/api";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";

import { createQueryClient } from "./query-client";

/**
 * Глобальная переменная для SSR оптимизации
 * Устанавливается в orpc/server.ts
 */
declare global {
  // eslint-disable-next-line no-var
  var $client: RouterClient<typeof appRouter> | undefined;
}

let clientQueryClientSingleton: QueryClient | undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: всегда создаем новый query client
    return createQueryClient();
  } else {
    // Browser: используем singleton паттерн для сохранения одного query client
    // В development режиме очищаем при hot-reload
    if (process.env.NODE_ENV === "development") {
      // @ts-ignore - global variable for HMR
      if (!window.__tanstack_query_client__) {
        // @ts-ignore
        window.__tanstack_query_client__ = createQueryClient();
      }
      // @ts-ignore
      return window.__tanstack_query_client__;
    }
    return (clientQueryClientSingleton ??= createQueryClient());
  }
};

const getBaseUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT || 3000}`;
};

// Создаем RPCLink (локально идёт через api/orpc Route Handler с таймаутом 120 сек)
const link = new RPCLink({
  url: `${getBaseUrl()}/api/orpc`,
});

// Создаем oRPC клиент (используем глобальный $client если доступен для SSR оптимизации)
export const client: RouterClient<typeof appRouter> =
  globalThis.$client ?? createORPCClient(link);

// Создаем утилиты для TanStack Query - предоставляет .queryOptions(), .mutationOptions(), .queryKey()
export const orpc = createTanstackQueryUtils(client);

/**
 * Хук для получения типизированного oRPC клиента с TanStack Query утилитами
 */
export const useORPC = () => {
  return orpc;
};

export function ORPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  );
}
