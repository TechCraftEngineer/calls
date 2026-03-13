"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import AudioPlayerModal from "@/components/audio-player-modal";
import CallList from "@/components/call-list";
import CustomDropdown from "@/components/custom-dropdown";
import Header from "@/components/header";
import Metrics from "@/components/metrics";
import Sidebar from "@/components/sidebar";
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [calls, setCalls] = useState<CallWithDetails[]>([]);
  const [metrics, setMetrics] = useState<MetricsData>({
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
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push("/auth/signin");
        return;
      }
      setUser(currentUser);

      const result = await api.calls.list({
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
      });

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
      // Убрали console.error для продакшена
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "UNAUTHORIZED"
      ) {
        router.push("/auth/signin");
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
          <section className="card">
            <div className="section-title" style={{ marginBottom: "24px" }}>
              Последние звонки{" "}
              <span
                style={{
                  fontSize: "12px",
                  color: "#ff4d4f",
                  cursor: "pointer",
                  marginLeft: "4px",
                }}
              >
                ?
              </span>
            </div>

            <div className="filters-grid">
              <div className="filter-item">
                <span className="filter-label">Направление</span>
                <select
                  className="select-input"
                  value={filters.direction}
                  onChange={(e) =>
                    setFilters({ ...filters, direction: e.target.value })
                  }
                >
                  <option value="all">Все</option>
                  <option value="incoming">Входящие</option>
                  <option value="outgoing">Исходящие</option>
                </select>
              </div>

              <div className="filter-item">
                <span className="filter-label">Отвечен/неотвечен</span>
                <select
                  className="select-input"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                >
                  <option value="all">Все</option>
                  <option value="missed">Не принятые</option>
                  <option value="answered">Принятые</option>
                </select>
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

              <div className="filter-item" style={{ minWidth: "150px" }}>
                <label className="filter-label">ДАТА ОТ</label>
                <input
                  type="date"
                  className="date-input"
                  value={filters.date_from}
                  onChange={(e) =>
                    setFilters({ ...filters, date_from: e.target.value })
                  }
                  onClick={(e) => (e.currentTarget as any).showPicker?.()}
                />
              </div>

              <div className="filter-item" style={{ minWidth: "150px" }}>
                <label className="filter-label">ДАТА ДО</label>
                <input
                  type="date"
                  className="date-input"
                  value={filters.date_to}
                  onChange={(e) =>
                    setFilters({ ...filters, date_to: e.target.value })
                  }
                  onClick={(e) => (e.currentTarget as any).showPicker?.()}
                />
              </div>

              <div className="filter-item-btn">
                <button
                  className="apply-btn"
                  onClick={() => setPagination((p) => ({ ...p, page: 1 }))}
                  style={{ width: "100%" }}
                >
                  Найти
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: "64px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="page-btn"
                  style={{
                    borderRadius: "20px",
                    padding: "0 16px",
                    height: "32px",
                    background: "transparent",
                    border: "1px solid #eee",
                    color: pagination.page <= 1 ? "#CCC" : "#888",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                >
                  Назад
                </button>

                {Array.from(
                  { length: Math.min(pagination.total_pages, 5) },
                  (_, i) => i + 1,
                ).map((p) => (
                  <button
                    key={p}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      border: "none",
                      background: pagination.page === p ? "#FFD600" : "#333",
                      color: pagination.page === p ? "#000" : "#fff",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onClick={() => handlePageChange(p)}
                  >
                    {p}
                  </button>
                ))}

                {pagination.total_pages > 5 && (
                  <>
                    <span style={{ color: "#999", fontSize: "13px" }}>...</span>
                    <button
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        border: "none",
                        background:
                          pagination.page === pagination.total_pages
                            ? "#FFD600"
                            : "#333",
                        color:
                          pagination.page === pagination.total_pages
                            ? "#000"
                            : "#fff",
                        fontWeight: 700,
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onClick={() => handlePageChange(pagination.total_pages)}
                    >
                      {pagination.total_pages}
                    </button>
                  </>
                )}

                <button
                  className="page-btn"
                  style={{
                    borderRadius: "20px",
                    padding: "0 16px",
                    height: "32px",
                    background: "transparent",
                    border: "1px solid #eee",
                    color:
                      pagination.page >= pagination.total_pages
                        ? "#CCC"
                        : "#888",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                >
                  Вперед
                </button>
              </div>

              <div
                style={{ display: "flex", gap: "32px", alignItems: "center" }}
              >
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#999",
                      fontSize: "14px",
                    }}
                  >
                    🔍
                  </span>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Поиск..."
                    style={{
                      paddingLeft: "32px",
                      width: "240px",
                      background: "#fff",
                      border: "1px solid #eee",
                    }}
                    value={filters.q}
                    onChange={(e) =>
                      setFilters({ ...filters, q: e.target.value })
                    }
                  />
                </div>
                <button className="xls-download-btn">
                  <span style={{ fontSize: "18px", opacity: 0.4 }}>📄</span>{" "}
                  Скачать в xls за сегодня
                </button>
              </div>
            </div>
          </section>

          <div
            className="card"
            style={{ padding: 0, minHeight: "200px", marginTop: "54px" }}
          >
            {calls.length === 0 && !loading ? (
              <div
                style={{ textAlign: "center", color: "#999", fontSize: "14px" }}
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
          </div>
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
