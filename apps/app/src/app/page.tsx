"use client";

import { paths } from "@calls/config";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@calls/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AudioPlayerModal from "@/components/features/calls/audio-player-modal";
import CallList from "@/components/features/calls/call-list";
import CustomDropdown from "@/components/ui/custom-dropdown";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import api from "@/lib/api";
import { getCurrentUser, type User } from "@/lib/auth";

interface Call {
  id: number;
  filename?: string;
  number?: string;
  timestamp: string;
  duration_seconds?: number;
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
    per_page: 15,
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
  const [activeAudio, setActiveAudio] = useState<{
    filename: string;
    number: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const callsParams = {
        page: pagination.page,
        per_page: pagination.per_page,
        q: filters.q || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        direction: filters.direction !== "all" ? filters.direction : undefined,
        manager: filters.manager || undefined,
        status: filters.status !== "all" ? filters.status : undefined,
        value: filters.value?.length ? filters.value : undefined,
        operator: filters.operator?.length ? filters.operator : undefined,
      };
      const [currentUser, result] = await Promise.all([
        getCurrentUser(),
        api.calls.list(callsParams),
      ]);
      if (!currentUser) {
        router.push(paths.auth.signin);
        return;
      }
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
        per_page: (result.pagination?.per_page ?? 15) as number,
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
  }, [pagination.page, pagination.per_page, filters, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
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
                  <Input
                    type="date"
                    className="date-input"
                    value={filters.date_from}
                    onChange={(e) =>
                      setFilters({ ...filters, date_from: e.target.value })
                    }
                    onClick={(e) =>
                      (e.currentTarget as HTMLInputElement).showPicker?.()
                    }
                  />
                </div>

                <div className="filter-item min-w-[150px]">
                  <label className="filter-label">ДАТА ДО</label>
                  <Input
                    type="date"
                    className="date-input"
                    value={filters.date_to}
                    onChange={(e) =>
                      setFilters({ ...filters, date_to: e.target.value })
                    }
                    onClick={(e) =>
                      (e.currentTarget as HTMLInputElement).showPicker?.()
                    }
                  />
                </div>

                <div className="filter-item-btn">
                  <Button
                    className="apply-btn w-full"
                    onClick={() => setPagination((p) => ({ ...p, page: 1 }))}
                  >
                    Найти
                  </Button>
                </div>
              </div>

              <div className="mt-16 flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="page-btn rounded-[20px] px-4 h-8 bg-transparent border-[#eee] text-[13px] font-semibold disabled:text-[#CCC] disabled:cursor-not-allowed"
                    style={{
                      color: pagination.page <= 1 ? "#CCC" : "#888",
                    }}
                    disabled={pagination.page <= 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                  >
                    Назад
                  </Button>

                  {Array.from(
                    { length: Math.min(pagination.total_pages, 5) },
                    (_, i) => i + 1,
                  ).map((p) => (
                    <Button
                      key={p}
                      variant={pagination.page === p ? "default" : "secondary"}
                      className="size-8 rounded-full p-0 text-[13px] font-bold min-w-8"
                      style={{
                        background: pagination.page === p ? "#FFD600" : "#333",
                        color: pagination.page === p ? "#000" : "#fff",
                      }}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </Button>
                  ))}

                  {pagination.total_pages > 5 && (
                    <>
                      <span className="text-[#999] text-[13px]">...</span>
                      <Button
                        variant="secondary"
                        className="size-8 rounded-full p-0 text-[13px] font-bold min-w-8"
                        style={{
                          background:
                            pagination.page === pagination.total_pages
                              ? "#FFD600"
                              : "#333",
                          color:
                            pagination.page === pagination.total_pages
                              ? "#000"
                              : "#fff",
                        }}
                        onClick={() => handlePageChange(pagination.total_pages)}
                      >
                        {pagination.total_pages}
                      </Button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    className="page-btn rounded-[20px] px-4 h-8 bg-transparent border-[#eee] text-[13px] font-semibold disabled:text-[#CCC] disabled:cursor-not-allowed"
                    style={{
                      color:
                        pagination.page >= pagination.total_pages
                          ? "#CCC"
                          : "#888",
                    }}
                    disabled={pagination.page >= pagination.total_pages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                  >
                    Вперед
                  </Button>
                </div>

                <div className="flex gap-8 items-center">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999] text-sm">
                      🔍
                    </span>
                    <Input
                      type="text"
                      className="text-input pl-8 w-60 bg-white border-[#eee]"
                      placeholder="Поиск..."
                      value={filters.q}
                      onChange={(e) =>
                        setFilters({ ...filters, q: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    className="xls-download-btn font-normal text-sm gap-2 p-0 h-auto"
                  >
                    <span className="text-lg opacity-40">📄</span>
                    Скачать в xls за сегодня
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card p-0! min-h-[200px] mt-[54px]">
            <CardContent className="p-0!">
              {calls.length === 0 && !loading ? (
                <div
                  style={{
                    textAlign: "center",
                    color: "#999",
                    fontSize: "14px",
                  }}
                >
                  Нет данных для отображения
                </div>
              ) : (
                <CallList
                  calls={calls}
                  onPlay={(filename, number) =>
                    setActiveAudio({ filename, number })
                  }
                  user={user}
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
              )}
            </CardContent>
          </Card>
        </div>

        {activeAudio && (
          <AudioPlayerModal
            filename={activeAudio.filename}
            number={activeAudio.number}
            onClose={() => setActiveAudio(null)}
          />
        )}
      </main>
    </div>
  );
}
