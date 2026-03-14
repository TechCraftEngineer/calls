import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

function captureApiErrorToPostHog(error: unknown) {
  if (typeof window === "undefined") return;
  const posthog = (
    window as { posthog?: { capture: (e: string, p?: object) => void } }
  ).posthog;
  if (!posthog) return;
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    posthog.capture("$exception", {
      $exception_message: message,
      $exception_type: "APIError",
      $exception_level: "error",
      $exception_stack_trace_raw: stack,
      source: "tanstack-query",
    });
  } catch {
    // Не ломаем приложение при ошибке отправки в PostHog
  }
}

// Очистка QueryClient в development режиме при hot-reload
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  // @ts-ignore - global variable for HMR
  window.__tanstack_query_client__ = undefined;
}

export const createQueryClient = () => {
  const queryCache = new QueryCache({
    onError: captureApiErrorToPostHog,
  });
  const mutationCache = new MutationCache({
    onError: captureApiErrorToPostHog,
  });
  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
        shouldRedactErrors: () => process.env.NODE_ENV !== "development",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
};
