"use client";

import { paths } from "@calls/config";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  DatePicker,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@calls/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Funnel, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AudioPlayerModal from "@/components/features/calls/audio-player-modal";
import { CallListDataGrid } from "@/components/features/calls/call-list/call-list-data-grid";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { PAGINATION_CONSTANTS } from "@/constants/pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { useSession } from "@/lib/better-auth";
import { useORPC } from "@/orpc/react";

interface Call {
  id: string;
  fileId?: string | null;
  number?: string;
  timestamp: string;
  duration?: number | null;
  direction?: string;
  internalNumber?: string;
  operatorName?: string | null;
  managerName?: string | null;
}

interface Transcript {
  id: string;
  summary?: string;
  callType?: string;
  callTopic?: string;
  sentiment?: string;
}

interface Evaluation {
  id?: string;
  valueScore?: number;
  valueExplanation?: string;
  managerRecommendations?: string[];
}

interface CallWithDetails {
  call: Call;
  transcript?: Transcript;
  evaluation?: Evaluation;
  analysisCostRub?: number | null;
}

interface Pagination {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface ManagerOption {
  id: string;
  name: string;
}
type DirectionFilter = "incoming" | "outgoing";
type StatusFilter = "missed" | "answered";

const directionOptions = [
  { value: "all", label: "Все" },
  { value: "incoming", label: "Входящие" },
  { value: "outgoing", label: "Исходящие" },
] as const;

const statusOptions = [
  { value: "all", label: "Все" },
  { value: "missed", label: "Не принятые" },
  { value: "answered", label: "Принятые" },
] as const;

const operatorOptions = [
  { value: "mango", label: "Манго" },
  { value: "megafon", label: "Мегафон" },
] as const;

const valueOptions = [1, 2, 3, 4, 5] as const;

/** Главная страница — список звонков. Доступна только авторизованным. */
export default function HomePage() {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user ?? null;
  const _userLoading = sessionPending;
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    per_page: PAGINATION_CONSTANTS.DEFAULT_PER_PAGE,
    total_pages: 0,
  });
  const [filters, setFilters] = useState({
    q: "",
    dateFrom: "",
    dateTo: "",
    direction: [] as DirectionFilter[],
    manager: [] as string[],
    status: [] as StatusFilter[],
    value: [] as number[],
    operator: [] as string[],
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const debouncedFilters = useDebounce(
    filters,
    PAGINATION_CONSTANTS.SEARCH_DEBOUNCE_MS,
  );
  const [activeAudio, setActiveAudio] = useState<{
    callId: string;
    number: string;
  } | null>(null);

  const callsListInput = {
    page: pagination.page,
    per_page: pagination.per_page,
    q: appliedFilters.q || undefined,
    date_from: appliedFilters.dateFrom || undefined,
    date_to: appliedFilters.dateTo || undefined,
    direction: appliedFilters.direction.length
      ? appliedFilters.direction
      : undefined,
    manager: appliedFilters.manager.length ? appliedFilters.manager : undefined,
    status: appliedFilters.status.length ? appliedFilters.status : undefined,
    value: appliedFilters.value?.length ? appliedFilters.value : undefined,
    operator: appliedFilters.operator?.length
      ? appliedFilters.operator
      : undefined,
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
    staleTime: 2 * 60 * 1000, // 2 минуты для списка звонков
    gcTime: 5 * 60 * 1000, // 5 минут
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
        prev.direction.join("|") !== debouncedFilters.direction.join("|") ||
        prev.manager.join("|") !== debouncedFilters.manager.join("|") ||
        prev.status.join("|") !== debouncedFilters.status.join("|") ||
        prev.value.join("|") !== debouncedFilters.value.join("|") ||
        prev.operator.join("|") !== debouncedFilters.operator.join("|");
      if (!changed) return prev;
      setPagination((p) => ({ ...p, page: 1 }));
      return debouncedFilters;
    });
  }, [debouncedFilters]);

  useEffect(() => {
    if (callsError && typeof callsError === "object" && "code" in callsError) {
      if ((callsError as { code?: string }).code === "UNAUTHORIZED") {
        router.push(paths.auth.signin);
      }
    }
  }, [callsError, router]);

  useEffect(() => {
    if (result) {
      setPagination({
        total: result.pagination?.total ?? 0,
        page: result.pagination?.page ?? 1,
        per_page:
          result.pagination?.per_page ?? PAGINATION_CONSTANTS.DEFAULT_PER_PAGE,
        total_pages: result.pagination?.total_pages ?? 0,
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
  const selectedDirectionLabel =
    filters.direction.length === 0
      ? "Все"
      : filters.direction
          .map(
            (value) => directionOptions.find((o) => o.value === value)?.label,
          )
          .filter(Boolean)
          .join(", ");
  const selectedStatusLabel =
    filters.status.length === 0
      ? "Все"
      : filters.status
          .map((value) => statusOptions.find((o) => o.value === value)?.label)
          .filter(Boolean)
          .join(", ");
  const selectedValueCount = filters.value.length;
  const selectedOperatorCount = filters.operator.length;
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
      per_page: perPage,
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
      operator: [],
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="app-container">
      <Sidebar />
      <Header user={user} />

      <main className="main-content">
        <div className="dashboard-page">
          <Card className="border-border/60 bg-card/90 shadow-sm">
            <CardHeader className="px-6 pt-5 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Последние звонки
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Фильтры применяются на сервере
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="font-normal text-sm gap-2 h-9"
                  disabled
                >
                  <span className="text-base opacity-60">📄</span>
                  Скачать XLS (скоро)
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full max-w-105">
                    <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="calls-search"
                      placeholder="Поиск по номеру, сотруднику, клиенту"
                      aria-label="Поиск по номеру, сотруднику или клиенту"
                      value={filters.q}
                      onChange={(e) =>
                        updateFilters((prev) => ({
                          ...prev,
                          q: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setPagination((p) => ({ ...p, page: 1 }));
                        }
                      }}
                      className="h-9 pl-9 pr-9"
                    />
                    {filters.q.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 size-7"
                        onClick={() =>
                          updateFilters((prev) => ({ ...prev, q: "" }))
                        }
                        aria-label="Очистить поиск"
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9">
                        <Funnel className="size-4" />
                        Направление: {selectedDirectionLabel}
                        {filters.direction.length > 0 && (
                          <Badge variant="secondary">
                            {filters.direction.length}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-56 space-y-3">
                      {directionOptions.map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center gap-2.5"
                        >
                          <Checkbox
                            id={`direction-${option.value}`}
                            checked={
                              option.value === "all"
                                ? filters.direction.length === 0
                                : filters.direction.includes(option.value)
                            }
                            onCheckedChange={(checked) => {
                              if (option.value === "all" && checked === true) {
                                updateFilters((prev) => ({
                                  ...prev,
                                  direction: [],
                                }));
                                return;
                              }
                              if (option.value === "all") return;
                              if (checked === true) {
                                updateFilters((prev) => ({
                                  ...prev,
                                  direction: [...prev.direction, option.value],
                                }));
                              } else {
                                updateFilters((prev) => ({
                                  ...prev,
                                  direction: prev.direction.filter(
                                    (v) => v !== option.value,
                                  ),
                                }));
                              }
                            }}
                          />
                          <Label
                            htmlFor={`direction-${option.value}`}
                            className="font-normal"
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9">
                        <Funnel className="size-4" />
                        Статус: {selectedStatusLabel}
                        {filters.status.length > 0 && (
                          <Badge variant="secondary">
                            {filters.status.length}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-56 space-y-3">
                      {statusOptions.map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center gap-2.5"
                        >
                          <Checkbox
                            id={`status-${option.value}`}
                            checked={
                              option.value === "all"
                                ? filters.status.length === 0
                                : filters.status.includes(option.value)
                            }
                            onCheckedChange={(checked) => {
                              if (option.value === "all" && checked === true) {
                                updateFilters((prev) => ({
                                  ...prev,
                                  status: [],
                                }));
                                return;
                              }
                              if (option.value === "all") return;
                              if (checked === true) {
                                updateFilters((prev) => ({
                                  ...prev,
                                  status: [...prev.status, option.value],
                                }));
                              } else {
                                updateFilters((prev) => ({
                                  ...prev,
                                  status: prev.status.filter(
                                    (v) => v !== option.value,
                                  ),
                                }));
                              }
                            }}
                          />
                          <Label
                            htmlFor={`status-${option.value}`}
                            className="font-normal"
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9">
                        <Funnel className="size-4" />
                        Сотрудники
                        {filters.manager.length > 0 && (
                          <Badge variant="secondary">
                            {filters.manager.length}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72">
                      <div className="space-y-3">
                        <Button
                          variant="ghost"
                          className="h-8 w-full justify-start px-2"
                          onClick={() =>
                            updateFilters((prev) => ({ ...prev, manager: [] }))
                          }
                        >
                          Все сотрудники
                        </Button>
                        <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                          {managerOptions.map((manager) => (
                            <div
                              key={manager.id}
                              className="flex items-center gap-2.5"
                            >
                              <Checkbox
                                id={`manager-${manager.id}`}
                                checked={filters.manager.includes(manager.id)}
                                onCheckedChange={(checked) =>
                                  updateFilters((prev) => ({
                                    ...prev,
                                    manager:
                                      checked === true
                                        ? [...prev.manager, manager.id]
                                        : prev.manager.filter(
                                            (v) => v !== manager.id,
                                          ),
                                  }))
                                }
                              />
                              <Label
                                htmlFor={`manager-${manager.id}`}
                                className="font-normal"
                              >
                                {manager.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9">
                        <Funnel className="size-4" />
                        Ценность
                        {selectedValueCount > 0 && (
                          <Badge variant="secondary">
                            {selectedValueCount}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-48 space-y-3">
                      {valueOptions.map((value) => (
                        <div key={value} className="flex items-center gap-2.5">
                          <Checkbox
                            id={`value-${value}`}
                            checked={filters.value.includes(value)}
                            onCheckedChange={(checked) =>
                              updateFilters((prev) => ({
                                ...prev,
                                value:
                                  checked === true
                                    ? [...prev.value, value]
                                    : prev.value.filter((v) => v !== value),
                              }))
                            }
                          />
                          <Label
                            htmlFor={`value-${value}`}
                            className="font-normal"
                          >
                            {value}
                          </Label>
                        </div>
                      ))}
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9">
                        <Funnel className="size-4" />
                        Оператор
                        {selectedOperatorCount > 0 && (
                          <Badge variant="secondary">
                            {selectedOperatorCount}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-56 space-y-3">
                      {operatorOptions.map((operator) => (
                        <div
                          key={operator.value}
                          className="flex items-center gap-2.5"
                        >
                          <Checkbox
                            id={`operator-${operator.value}`}
                            checked={filters.operator.includes(operator.value)}
                            onCheckedChange={(checked) =>
                              updateFilters((prev) => ({
                                ...prev,
                                operator:
                                  checked === true
                                    ? [...prev.operator, operator.value]
                                    : prev.operator.filter(
                                        (v) => v !== operator.value,
                                      ),
                              }))
                            }
                          />
                          <Label
                            htmlFor={`operator-${operator.value}`}
                            className="font-normal"
                          >
                            {operator.label}
                          </Label>
                        </div>
                      ))}
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-9">
                        <Funnel className="size-4" />
                        Период
                        {(filters.dateFrom || filters.dateTo) && (
                          <Badge variant="secondary">1</Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Дата от
                        </Label>
                        <DatePicker
                          value={filters.dateFrom}
                          onChange={(v) =>
                            updateFilters((prev) => ({ ...prev, dateFrom: v }))
                          }
                          placeholder="Выберите дату"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Дата до
                        </Label>
                        <DatePicker
                          value={filters.dateTo}
                          onChange={(v) =>
                            updateFilters((prev) => ({ ...prev, dateTo: v }))
                          }
                          placeholder="Выберите дату"
                        />
                      </div>
                    </PopoverContent>
                  </Popover>

                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={resetFilters}
                      className="h-9"
                    >
                      Сбросить
                    </Button>
                    <Button
                      className="h-9"
                      onClick={() => setPagination((p) => ({ ...p, page: 1 }))}
                    >
                      Найти
                    </Button>
                  </div>
                </div>
              </div>
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
              onRecommendationsGenerated={(callId, recommendations) => {
                queryClient.setQueryData(
                  orpc.calls.list.queryKey({ input: callsListInput }),
                  (prev) => {
                    if (!prev) return prev;
                    const updated = prev.calls.map((item) =>
                      item.call.id === callId
                        ? {
                            ...item,
                            evaluation: item.evaluation
                              ? {
                                  ...item.evaluation,
                                  managerRecommendations: recommendations,
                                }
                              : ({
                                  id: callId,
                                  managerRecommendations: recommendations,
                                } as (typeof item)["evaluation"]),
                          }
                        : item,
                    );
                    return { ...prev, calls: updated };
                  },
                );
              }}
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
    </div>
  );
}
