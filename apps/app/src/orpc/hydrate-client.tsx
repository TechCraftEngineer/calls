import {
  type DehydratedState,
  dehydrate,
  HydrationBoundary,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { createQueryClient } from "./query-client";

interface HydrateClientProps {
  children: ReactNode;
  state?: DehydratedState;
}

/**
 * Компонент для гидратации состояния QueryClient на клиенте
 * Используется в серверных компонентах для передачи prefetch данных
 */
export function HydrateClient({ children, state }: HydrateClientProps) {
  return (
    <HydrationBoundary state={state ?? dehydrate(createQueryClient())}>
      {children}
    </HydrationBoundary>
  );
}
