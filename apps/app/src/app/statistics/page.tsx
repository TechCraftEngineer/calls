"use client";

import { paths } from "@calls/config";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Header from "@/components/header";
import KpiTable from "@/components/kpi-table";
import ReportSettingsPanel from "@/components/report-settings-panel";
import Sidebar from "@/components/sidebar";
import api from "@/lib/api";
import { getCurrentUser, type User } from "@/lib/auth";

interface StatsRow {
  name: string;
  internal_number: string;
  incoming: {
    count: number;
    duration: number;
  };
  outgoing: {
    count: number;
    duration: number;
  };
  score_distribution: Record<string, { count: number }>;
}

function StatisticsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<StatsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    tabFromUrl === "settings" || tabFromUrl === "kpi"
      ? tabFromUrl
      : "statistics",
  );
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    sort: "name",
    order: "asc",
  });

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push(paths.auth.signin);
        return;
      }
      setUser(currentUser);

      const result = await api.statistics.getStatistics({
        sort: filters.sort,
        order: filters.order,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      });
      setStats((result.statistics || []) as StatsRow[]);
    } catch (error: unknown) {
      // Убрали console.error для продакшена
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: string }).code === "FORBIDDEN"
      ) {
        alert("Доступ запрещен. Только администратору.");
        router.push(paths.dashboard.root);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, router]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "settings" || t === "kpi") setActiveTab(t);
    else if (t === "statistics") setActiveTab("statistics");
  }, [searchParams]);

  const handleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sort: field,
      order: prev.sort === field && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  const getTotals = () => {
    return stats.reduce(
      (acc, row) => ({
        incoming_count: acc.incoming_count + row.incoming.count,
        outgoing_count: acc.outgoing_count + row.outgoing.count,
        incoming_duration: acc.incoming_duration + row.incoming.duration,
        outgoing_duration: acc.outgoing_duration + row.outgoing.duration,
      }),
      {
        incoming_count: 0,
        outgoing_count: 0,
        incoming_duration: 0,
        outgoing_duration: 0,
      },
    );
  };

  const totals = getTotals();

  return (
    <div className="app-container">
      <Sidebar user={user} />
      <Header user={user} />

      <main className="main-content">
        <header className="page-header" style={{ marginBottom: "32px" }}>
          <h1 className="page-title">Статистика звонков</h1>
          <p className="page-subtitle">Эффективность работы менеджеров</p>
        </header>

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "24px",
            borderBottom: "2px solid #EEE",
          }}
        >
          <button
            onClick={() => setActiveTab("statistics")}
            style={{
              padding: "12px 24px",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === "statistics"
                  ? "2px solid #FF6B35"
                  : "2px solid transparent",
              color: activeTab === "statistics" ? "#FF6B35" : "#666",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: "-2px",
            }}
          >
            Сводная статистика
          </button>
          <button
            onClick={() => setActiveTab("kpi")}
            style={{
              padding: "12px 24px",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === "kpi"
                  ? "2px solid #FF6B35"
                  : "2px solid transparent",
              color: activeTab === "kpi" ? "#FF6B35" : "#666",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: "-2px",
            }}
          >
            Расчет KPI
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            style={{
              padding: "12px 24px",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === "settings"
                  ? "2px solid #FF6B35"
                  : "2px solid transparent",
              color: activeTab === "settings" ? "#FF6B35" : "#666",
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: "-2px",
            }}
          >
            Настройки отчетов
          </button>
        </div>

        {activeTab !== "settings" && (
          <section className="card" style={{ marginBottom: "24px" }}>
            <div
              className="section-title"
              style={{
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Фильтрация статистики <span style={{ fontSize: "14px" }}>📅</span>
            </div>
            <div
              style={{
                display: "flex",
                gap: "24px",
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
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
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  className="apply-btn"
                  onClick={loadStats}
                  style={{
                    background:
                      "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
                    color: "white",
                    border: "none",
                  }}
                >
                  Применить
                </button>
                <button
                  className="ghost-btn"
                  onClick={() => {
                    setFilters({ ...filters, date_from: "", date_to: "" });
                    setTimeout(loadStats, 100);
                  }}
                  style={{
                    background: "white",
                    border: "1px solid #DDD",
                    color: "#333",
                  }}
                >
                  Сбросить
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === "statistics" && (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #EEE",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 className="section-title" style={{ margin: 0 }}>
                Статистика по внутренним номерам
              </h3>
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#999",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  СОРТИРОВКА:
                </span>
                <button
                  className="ghost-btn"
                  onClick={() => handleSort("incoming_count")}
                  style={{
                    background:
                      filters.sort === "incoming_count" ? "#F5F5F7" : "white",
                    border: "1px solid #DDD",
                    padding: "6px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Входящие
                </button>
                <button
                  className="ghost-btn"
                  onClick={() => handleSort("outgoing_count")}
                  style={{
                    background:
                      filters.sort === "outgoing_count" ? "#F5F5F7" : "white",
                    border: "1px solid #DDD",
                    padding: "6px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  Исходящие
                </button>
              </div>
            </div>

            <table className="op-table">
              <thead>
                <tr>
                  <th>Сотрудник</th>
                  <th>Внутренний номер</th>
                  <th
                    colSpan={2}
                    style={{
                      textAlign: "center",
                      borderBottom: "1px solid #EEE",
                    }}
                  >
                    Количество звонков
                  </th>
                  <th
                    colSpan={2}
                    style={{
                      textAlign: "center",
                      borderBottom: "1px solid #EEE",
                    }}
                  >
                    Время разговора
                  </th>
                  <th>Распределение оценок</th>
                </tr>
                <tr>
                  <th></th>
                  <th></th>
                  <th
                    style={{ fontSize: "10px", color: "#999", fontWeight: 600 }}
                  >
                    Исходящие
                  </th>
                  <th
                    style={{ fontSize: "10px", color: "#999", fontWeight: 600 }}
                  >
                    Входящие
                  </th>
                  <th
                    style={{ fontSize: "10px", color: "#999", fontWeight: 600 }}
                  >
                    Исх (мин)
                  </th>
                  <th
                    style={{ fontSize: "10px", color: "#999", fontWeight: 600 }}
                  >
                    Вх (мин)
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ textAlign: "center", padding: "40px" }}
                    >
                      Загрузка…
                    </td>
                  </tr>
                ) : stats.length > 0 ? (
                  <>
                    <tr style={{ background: "#F9F9F9", fontWeight: 700 }}>
                      <td>
                        Всего
                        {stats.length > 0 && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#999",
                              fontWeight: 400,
                              marginTop: "2px",
                            }}
                          >
                            {stats.length}{" "}
                            {stats.length === 1
                              ? "менеджер"
                              : stats.length < 5
                                ? "менеджера"
                                : "менеджеров"}
                          </div>
                        )}
                      </td>
                      <td>—</td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {totals.outgoing_count}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {totals.incoming_count}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {Math.floor(totals.outgoing_duration / 60)}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>
                        {Math.floor(totals.incoming_duration / 60)}
                      </td>
                      <td>—</td>
                    </tr>
                    {stats.map((row) => (
                      <tr key={row.internal_number || row.name}>
                        <td style={{ fontWeight: 600 }}>{row.name || "—"}</td>
                        <td>{row.internal_number || "—"}</td>
                        <td style={{ textAlign: "center" }}>
                          {row.outgoing.count}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {row.incoming.count}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {Math.floor(row.outgoing.duration / 60)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {Math.floor(row.incoming.duration / 60)}
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            {Object.entries(row.score_distribution || {})
                              .toSorted(
                                ([a], [b]) => parseInt(a, 10) - parseInt(b, 10),
                              )
                              .map(([score, data]: [string, any]) => {
                                const count = data?.count || 0;
                                if (count === 0) return null;
                                const scoreNum = parseInt(score, 10);
                                return (
                                  <span
                                    key={score}
                                    style={{
                                      padding: "3px 8px",
                                      borderRadius: "12px",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      background:
                                        scoreNum === 1
                                          ? "#FF5252"
                                          : scoreNum === 2
                                            ? "#FF9800"
                                            : scoreNum === 3
                                              ? "#2196F3"
                                              : scoreNum === 4
                                                ? "#4CAF50"
                                                : "#FFD600",
                                      color:
                                        scoreNum <= 2
                                          ? "white"
                                          : scoreNum === 5
                                            ? "black"
                                            : "white",
                                    }}
                                  >
                                    {score}:{count}
                                  </span>
                                );
                              })}
                            {Object.keys(row.score_distribution || {})
                              .length === 0 && (
                              <span style={{ color: "#ccc" }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "#999",
                      }}
                    >
                      Нет данных
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "kpi" && (
          <KpiTable dateFrom={filters.date_from} dateTo={filters.date_to} />
        )}

        {activeTab === "settings" && user && (
          <ReportSettingsPanel user={user} />
        )}
      </main>
    </div>
  );
}

export default function StatisticsPage() {
  return (
    <Suspense
      fallback={
        <div className="app-container">
          <main
            className="main-content"
            style={{ padding: "48px", textAlign: "center" }}
          >
            Загрузка…
          </main>
        </div>
      }
    >
      <StatisticsPageContent />
    </Suspense>
  );
}
