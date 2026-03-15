"use client";

import { paths } from "@calls/config";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  DatePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@calls/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AudioPlayerModal from "@/components/features/calls/audio-player-modal";
import { CallListDataGrid } from "@/components/features/calls/call-list/call-list-data-grid";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import CustomDropdown from "@/components/ui/custom-dropdown";
import { SearchInput } from "@/components/ui/search-input";
import { PAGINATION_CONSTANTS } from "@/constants/pagination";
import { useDebounce } from "@/hooks/use-debounce";
import api from "@/lib/api";
import { getCurrentUser, type User } from "@/lib/auth";
import { useSession } from "@/lib/better-auth";

interface Call {
  id: number;
  filename?: string;
  number?: string;
  timestamp: string;
  duration?: number | null;
  direction?: string;
  internal_number?: string;
  operator_name?: string;
  manager_name?: string;
}

interface Transcript {
  id: number;
  summary?: string;
  call_type?: string;
  call_topic?: string;
  sentiment?: string;
}

interface Evaluation {
  id?: number;
  value_score?: number;
  value_explanation?: string;
  manager_recommendations?: string[];
}

interface CallWithDetails {
  call: Call;
  transcript?: Transcript;
  evaluation?: Evaluation;
}

interface Pagination {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface MetricsData {
  total_calls: number;
  transcribed: number;
  avg_duration: number;
  last_sync?: string | null;
}

/** Главная страница — список звонков. Доступна только авторизованным. */
export default function HomePage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const hasSessionFetchedRef = useRef(false);
  const [user, setUser] = useState<User | null>(null);
  const [calls, setCalls] = useState<CallWithDetails[]>([]);
  const [_metrics, setMetrics] = useState<MetricsData>({
    total_calls: 0,
    transcribed: 0,
    avg_duration: 0,
    last_sync: null,
  });
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    per_page: PAGINATION_CONSTANTS.DEFAULT_PER_PAGE,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    q: "",
    date_from: "",
    date_to: "",
    direction: "all",
    manager: "",
    status: "all",
    value: [] as number[],
    operator: [] as string[],
  });
  const debouncedFilters = useDebounce(
    filters,
    PAGINATION_CONSTANTS.SEARCH_DEBOUNCE_MS,
  );
  const [activeAudio, setActiveAudio] = useState<{
    callId: string;
    number: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (sessionPending) return;
    if (!session?.user) return;

    try {
      setLoading(true);
      const callsParams = {
        page: pagination.page,
        per_page: pagination.per_page,
        q: debouncedFilters.q || undefined,
        date_from: debouncedFilters.date_from || undefined,
        date_to: debouncedFilters.date_to || undefined,
        direction:
          debouncedFilters.direction !== "all"
            ? debouncedFilters.direction
            : undefined,
        manager: debouncedFilters.manager || undefined,
        status:
          debouncedFilters.status !== "all"
            ? debouncedFilters.status
            : undefined,
        value: debouncedFilters.value?.length
          ? debouncedFilters.value
          : undefined,
        operator: debouncedFilters.operator?.length
          ? debouncedFilters.operator
          : undefined,
      };
      const [currentUser, result] = await Promise.all([
        getCurrentUser(),
        api.calls.list(callsParams),
      ]);
      if (!currentUser) return;
      setUser(currentUser);

      setCalls((result.calls || []) as CallWithDetails[]);
      setMetrics(
        (result.metrics ?? {
          total_calls: 0,
          transcribed: 0,
          avg_duration: 0,
          last_sync: null,
        }) as unknown as MetricsData,
      );
      setPagination({
        total: (result.pagination?.total ?? 0) as number,
        page: (result.pagination?.page ?? 1) as number,
        per_page: (result.pagination?.per_page ??
          PAGINATION_CONSTANTS.DEFAULT_PER_PAGE) as number,
        total_pages: (result.pagination?.total_pages ?? 0) as number,
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "UNAUTHORIZED"
      ) {
        router.push(paths.auth.signin);
      }
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.per_page,
    debouncedFilters,
    router,
    session?.user,
    sessionPending,
  ]);

  // Редирект на signin только когда сессия точно загружена и пользователя нет.
  // useSession может вернуть isPending: false до завершения первого fetch (Better Auth #960),
  // поэтому ждём либо перехода sessionPending true→false, либо 300ms перед редиректом.
  useEffect(() => {
    if (sessionPending) {
      hasSessionFetchedRef.current = true;
      return;
    }
    if (session?.user) return;

    if (hasSessionFetchedRef.current) {
      router.push(paths.auth.signin);
      return;
    }
    const timer = setTimeout(() => {
      hasSessionFetchedRef.current = true;
      router.push(paths.auth.signin);
    }, 300);
    return () => clearTimeout(timer);
  }, [sessionPending, session?.user, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePaginationChange = (page: number, perPage: number) => {
    setPagination((prev) => ({
      ...prev,
      page,
      per_page: perPage,
    }));
  };

  return (
    <div className="app-container">
      <Sidebar user={user} />
      <Header user={user} />

      <main className="main-content">
        <div className="dashboard-page">
          <Card className="card">
            <CardHeader className="p-0 pb-6">
              <div className="section-title mb-6">
                Последние звонки{" "}
                <span className="text-xs text-[#ff4d4f] cursor-pointer ml-1">
                  ?
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <SearchInput
                  value={filters.q}
                  onChange={(q) => setFilters((f) => ({ ...f, q }))}
                  onSearch={() => setPagination((p) => ({ ...p, page: 1 }))}
                />
                <Button
                  variant="ghost"
                  className="xls-download-btn font-normal text-sm gap-2 p-0 h-auto"
                >
                  <span className="text-lg opacity-40">📄</span>
                  Скачать в xls за сегодня
                </Button>
              </div>
              <div className="filters-grid">
                <div className="filter-item">
                  <span className="filter-label">Направление</span>
                  <Select
                    value={filters.direction}
                    onValueChange={(v) =>
                      setFilters({ ...filters, direction: v })
                    }
                  >
                    <SelectTrigger className="select-input h-9 border-[#ddd] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все</SelectItem>
                      <SelectItem value="incoming">Входящие</SelectItem>
                      <SelectItem value="outgoing">Исходящие</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="filter-item">
                  <span className="filter-label">Отвечен/неотвечен</span>
                  <Select
                    value={filters.status}
                    onValueChange={(v) => setFilters({ ...filters, status: v })}
                  >
                    <SelectTrigger className="select-input h-9 border-[#ddd] bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все</SelectItem>
                      <SelectItem value="missed">Не принятые</SelectItem>
                      <SelectItem value="answered">Принятые</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="filter-item">
                  <span className="filter-label">Сотрудники</span>
                  <CustomDropdown
                    type="manager"
                    label="Выбрать"
                    value={filters.manager}
                    onChange={(val) =>
                      setFilters({ ...filters, manager: val as string })
                    }
                  />
                </div>

                <div className="filter-item">
                  <span className="filter-label">Ценность</span>
                  <CustomDropdown
                    type="value"
                    label="Ценность (Любая)"
                    value={filters.value}
                    onChange={(val) =>
                      setFilters({ ...filters, value: val as number[] })
                    }
                  />
                </div>

                <div className="filter-item">
                  <span className="filter-label">Оператор</span>
                  <CustomDropdown
                    type="operator"
                    label="Оператор (Все)"
                    value={filters.operator}
                    onChange={(val) =>
                      setFilters({ ...filters, operator: val as string[] })
                    }
                  />
                </div>

                <div className="filter-item min-w-[150px]">
                  <label className="filter-label">ДАТА ОТ</label>
                  <DatePicker
                    value={filters.date_from}
                    onChange={(v) => setFilters({ ...filters, date_from: v })}
                    placeholder="Выберите дату"
                  />
                </div>

                <div className="filter-item min-w-[150px]">
                  <label className="filter-label">ДАТА ДО</label>
                  <DatePicker
                    value={filters.date_to}
                    onChange={(v) => setFilters({ ...filters, date_to: v })}
                    placeholder="Выберите дату"
                  />
                </div>

                <div className="filter-item-btn">
                  <Button
                    className="w-full"
                    onClick={() => setPagination((p) => ({ ...p, page: 1 }))}
                  >
                    Найти
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="mt-[54px] min-h-[200px] overflow-hidden rounded-lg border border-border/30 bg-card/40">
            <CallListDataGrid
              calls={calls}
              pagination={pagination}
              isLoading={loading}
              onPaginationChange={handlePaginationChange}
              onPlay={(callId, number) => setActiveAudio({ callId, number })}
              onCallDeleted={(callId) => {
                setCalls((prev) =>
                  prev.filter((item) => item.call.id !== callId),
                );
                loadData();
              }}
              onRecommendationsGenerated={(callId, recommendations) => {
                setCalls((prev) =>
                  prev.map((item) =>
                    item.call.id === callId
                      ? {
                          ...item,
                          evaluation: {
                            ...(item.evaluation || {}),
                            manager_recommendations: recommendations,
                          },
                        }
                      : item,
                  ),
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
