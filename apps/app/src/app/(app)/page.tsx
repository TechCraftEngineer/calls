"use client";

import { paths } from "@calls/config";
import { Button, Card, CardContent, CardHeader } from "@calls/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AudioPlayerModal from "@/components/features/calls/audio-player-modal";
import { CallListDataGrid } from "@/components/features/calls/call-list/call-list-data-grid";
import type { CallWithDetails } from "@/components/features/calls/call-list/types";
import {
  CallsFilters,
  type CallsFiltersState,
  type ManagerOption,
} from "@/components/features/calls/calls-filters";
import Header from "@/components/layout/header";
import { PAGINATION_CONSTANTS } from "@/constants/pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { useSession } from "@/lib/better-auth";
import { useORPC } from "@/orpc/react";

interface Pagination {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/** Главная страница — список звонков. Доступна только авторизованным. */
export default function HomePage() {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user ?? null;
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    perPage: PAGINATION_CONSTANTS.DEFAULT_PER_PAGE,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<CallsFiltersState>({
    q: "",
    dateFrom: "",
    dateTo: "",
    direction: [],
    manager: [],
    status: [],
    value: [],
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const debouncedFilters = useDebounce(filters, PAGINATION_CONSTANTS.SEARCH_DEBOUNCE_MS);
  const [activeAudio, setActiveAudio] = useState<{
    callId: string;
    number: string;
  } | null>(null);

  const callsListInput = {
    page: pagination.page,
    perPage: pagination.perPage,
    q: appliedFilters.q || undefined,
    dateFrom: appliedFilters.dateFrom || undefined,
    dateTo: appliedFilters.dateTo || undefined,
    direction: appliedFilters.direction.length ? appliedFilters.direction : undefined,
    manager: appliedFilters.manager.length ? appliedFilters.manager : undefined,
    status: appliedFilters.status.length ? appliedFilters.status : undefined,
    value: appliedFilters.value?.length ? appliedFilters.value : undefined,
  };

  const {
    data: result,
    isPending: loading,
    error: callsError,
  } = useQuery({
    ...orpc.calls.list.queryOptions({ input: callsListInput }),
    enabled: !!session?.user && !sessionPending,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const updateFilters = (updater: (prev: typeof filters) => typeof filters) => {
    setFilters((prev) => updater(prev));
  };

  useEffect(() => {
    setAppliedFilters((prev) => {
      const changed =
        prev.q !== debouncedFilters.q ||
        prev.dateFrom !== debouncedFilters.dateFrom ||
        prev.dateTo !== debouncedFilters.dateTo ||
        JSON.stringify(prev.direction) !== JSON.stringify(debouncedFilters.direction) ||
        JSON.stringify(prev.manager) !== JSON.stringify(debouncedFilters.manager) ||
        JSON.stringify(prev.status) !== JSON.stringify(debouncedFilters.status) ||
        JSON.stringify(prev.value) !== JSON.stringify(debouncedFilters.value);
      if (!changed) return prev;
      setPagination((p) => ({ ...p, page: 1 }));
      return debouncedFilters;
    });
  }, [debouncedFilters]);

  useEffect(() => {
    if (callsError && typeof callsError === "object" && "code" in callsError) {
      const errorCode = (callsError as { code?: string }).code;
      const errorData = (callsError as { data?: Record<string, unknown> }).data;
      const errorMessage = (callsError as { message?: string }).message ?? "";

      if (errorCode === "UNAUTHORIZED") {
        router.push(paths.auth.signin);
        return;
      }

      // Проверяем структурированные поля ошибки для определения проблемы с workspace
      const isWorkspaceError =
        errorData?.reason === "no_active_workspace" ||
        errorData?.reason === "workspace_not_found" ||
        errorData?.code === "WORKSPACE_REQUIRED" ||
        errorData?.code === "NO_ACTIVE_WORKSPACE";

      // Fallback на проверку message только если структурированные поля отсутствуют
      const isWorkspaceMessageError =
        !isWorkspaceError &&
        errorCode === "BAD_REQUEST" &&
        /workspace|no active workspace/i.test(errorMessage);

      if (isWorkspaceError || isWorkspaceMessageError) {
        router.push(paths.onboarding.createWorkspace);
      }
    }
  }, [callsError, router]);

  useEffect(() => {
    if (result) {
      setPagination({
        total: result.pagination?.total ?? 0,
        page: result.pagination?.page ?? 1,
        perPage: result.pagination?.perPage ?? PAGINATION_CONSTANTS.DEFAULT_PER_PAGE,
        totalPages: result.pagination?.totalPages ?? 0,
      });
    }
  }, [result]);

  const calls = (result?.calls ?? []) as CallWithDetails[];
  const managerOptions: ManagerOption[] = Array.isArray(result?.managers)
    ? result.managers.filter(
        (manager): manager is ManagerOption =>
          typeof manager === "object" &&
          manager !== null &&
          typeof manager.id === "string" &&
          manager.id.trim().length > 0 &&
          typeof manager.name === "string" &&
          manager.name.trim().length > 0,
      )
    : [];
  const invalidateCalls = () =>
    queryClient.invalidateQueries({
      queryKey: orpc.calls.list.queryKey({ input: callsListInput }),
    });

  // Редирект на signin только когда сессия точно загружена и пользователя нет.
  useEffect(() => {
    if (sessionPending) return;
    if (session?.user) return;

    router.push(paths.auth.signin);
  }, [sessionPending, session?.user, router]);

  const handlePaginationChange = (page: number, perPage: number) => {
    setPagination((prev) => ({
      ...prev,
      page,
      perPage,
    }));
  };

  const resetFilters = () => {
    setFilters({
      q: "",
      dateFrom: "",
      dateTo: "",
      direction: [],
      manager: [],
      status: [],
      value: [],
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <>
      <Header user={user} />

      <main className="main-content">
        <div className="dashboard-page">
          <Card className="border-border/60 bg-card/90 shadow-sm">
            <CardHeader className="px-6 pt-5 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Последние звонки</h2>
                  <p className="text-sm text-muted-foreground">Фильтры применяются на сервере</p>
                </div>
                <Button variant="ghost" className="font-normal text-sm gap-2 h-9" disabled>
                  <span className="text-base opacity-60">📄</span>
                  Скачать XLS (скоро)
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <CallsFilters
                filters={filters}
                managerOptions={managerOptions}
                updateFilters={updateFilters}
                onReset={resetFilters}
                onSubmit={() => setPagination((p) => ({ ...p, page: 1 }))}
              />
            </CardContent>
          </Card>

          <section className="mt-8 min-h-50 overflow-hidden rounded-lg border border-border/30 bg-card/40">
            <CallListDataGrid
              calls={calls}
              pagination={pagination}
              isLoading={loading}
              onPaginationChange={handlePaginationChange}
              onPlay={(callId, number) => setActiveAudio({ callId, number })}
              onCallDeleted={() => invalidateCalls()}
              onCallsDeleted={() => invalidateCalls()}
              onRecommendationsGenerated={() => invalidateCalls()}
            />
          </section>
        </div>

        {activeAudio && (
          <AudioPlayerModal
            callId={activeAudio.callId}
            number={activeAudio.number}
            onClose={() => setActiveAudio(null)}
          />
        )}
      </main>
    </>
  );
}
