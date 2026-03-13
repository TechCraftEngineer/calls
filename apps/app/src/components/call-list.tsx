"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import type { User } from "@/lib/auth";
import { isMobileDevice } from "@/lib/utils";
import CallDetailModal from "./call-detail-modal";
import RecommendationsModal from "./recommendations-modal";

interface Call {
  id: number;
  number?: string;
  timestamp: string;
  direction?: string;
  internal_number?: string;
  manager_name?: string;
  operator_name?: string;
  duration_seconds?: number;
  filename?: string;
  customer_name?: string;
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

interface CallListProps {
  calls: CallWithDetails[];
  onPlay?: (filename: string, number: string) => void;
  user?: User | null;
  onCallDeleted?: (callId: number) => void;
  onRecommendationsGenerated?: (
    callId: number,
    recommendations: string[],
  ) => void;
}

type SortKey =
  | "type"
  | "number"
  | "manager"
  | "status"
  | "date"
  | "score"
  | "summary"
  | "duration";
type SortOrder = "asc" | "desc";

interface ColumnConfig {
  key: string;
  label: string;
  tooltip: string;
  sortKey?: SortKey;
}

const COLUMNS: ColumnConfig[] = [
  {
    key: "type",
    label: "Тип",
    tooltip: "Направление звонка: Входящий или Исходящий",
    sortKey: "type",
  },
  {
    key: "number",
    label: "Номер клиента",
    tooltip: "Телефонный номер клиента и внутренний номер сотрудника",
    sortKey: "number",
  },
  {
    key: "manager",
    label: "Сотрудник",
    tooltip: "Имя сотрудника, участвовавшего в разговоре",
    sortKey: "manager",
  },
  {
    key: "status",
    label: "Статус",
    tooltip: "Результат звонка: Принят или Пропущен",
    sortKey: "status",
  },
  {
    key: "date",
    label: "Дата",
    tooltip: "Дата и время начала звонка",
    sortKey: "date",
  },
  {
    key: "score",
    label: "Ценность",
    tooltip: "Оценка качества звонка ИИ (от 1 до 5 звезд)",
    sortKey: "score",
  },
  {
    key: "summary",
    label: "Вывод",
    tooltip: "Краткое резюме разговора, составленное ИИ",
    sortKey: "summary",
  },
  {
    key: "record",
    label: "Запись",
    tooltip: "Возможность прослушать аудиозапись разговора",
  },
  {
    key: "duration",
    label: "Длительность",
    tooltip: "Общая продолжительность разговора",
    sortKey: "duration",
  },
];

const COLUMN_ORDER_STORAGE_KEY = "callList_columnOrder";
const DEFAULT_COLUMN_ORDER = COLUMNS.map((c) => c.key);

// Загрузка порядка колонок из localStorage
const loadColumnOrder = (): string[] => {
  if (typeof window === "undefined") return DEFAULT_COLUMN_ORDER;

  try {
    const saved = localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
    if (!saved) return DEFAULT_COLUMN_ORDER;

    const parsed = JSON.parse(saved) as string[];
    // Валидация: проверяем, что все колонки из COLUMNS присутствуют
    const allKeys = new Set(COLUMNS.map((c) => c.key));
    const savedKeys = new Set(parsed);

    // Если есть несоответствия, возвращаем дефолтный порядок
    if (
      allKeys.size !== savedKeys.size ||
      !Array.from(allKeys).every((k) => savedKeys.has(k))
    ) {
      return DEFAULT_COLUMN_ORDER;
    }

    // Фильтруем только валидные ключи и добавляем отсутствующие в конец
    const validOrder = parsed.filter((k) => allKeys.has(k));
    const missingKeys = Array.from(allKeys).filter((k) => !savedKeys.has(k));

    return [...validOrder, ...missingKeys];
  } catch (error) {
    // Убрали console.error для продакшена
    return DEFAULT_COLUMN_ORDER;
  }
};

// Сохранение порядка колонок в localStorage
const saveColumnOrder = (order: string[]): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch (error) {
    console.error("Failed to save column order to localStorage:", error);
  }
};

export default function CallList({
  calls,
  onPlay,
  user,
  onCallDeleted,
  onRecommendationsGenerated,
}: CallListProps) {
  const [columnOrder, setColumnOrder] = useState<string[]>(loadColumnOrder);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    COLUMNS.map((c) => c.key),
  );
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    order: SortOrder;
  } | null>(null);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [recommendationsCallId, setRecommendationsCallId] = useState<
    number | null
  >(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);

  const formatTimestamp = (ts: string) => {
    if (!ts) return "—";
    const date = new Date(ts);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const formatDuration = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return "00:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleSort = (key: SortKey) => {
    let order: SortOrder = "desc";
    if (sortConfig?.key === key && sortConfig.order === "desc") {
      order = "asc";
    }
    setSortConfig({ key, order });
  };

  const sortedCalls = useMemo(() => {
    if (!sortConfig) return calls;

    return [...calls].sort((a, b) => {
      let valA: any, valB: any;

      switch (sortConfig.key) {
        case "type":
          valA = a.call.direction || "";
          valB = b.call.direction || "";
          break;
        case "number":
          valA = a.call.number || "";
          valB = b.call.number || "";
          break;
        case "manager":
          valA = a.call.manager_name || a.call.operator_name || "";
          valB = b.call.manager_name || b.call.operator_name || "";
          break;
        case "status":
          valA = a.call.duration_seconds || 0;
          valB = b.call.duration_seconds || 0;
          break;
        case "date":
          valA = new Date(a.call.timestamp).getTime();
          valB = new Date(b.call.timestamp).getTime();
          break;
        case "score":
          valA = a.evaluation?.value_score || 0;
          valB = b.evaluation?.value_score || 0;
          break;
        case "summary":
          valA = a.transcript?.summary || "";
          valB = b.transcript?.summary || "";
          break;
        case "duration":
          valA = a.call.duration_seconds || 0;
          valB = b.call.duration_seconds || 0;
          break;
        default:
          return 0;
      }

      if (valA < valB) return sortConfig.order === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.order === "asc" ? 1 : -1;
      return 0;
    });
  }, [calls, sortConfig]);

  // Фоны по дням: чередование двух приглушённых цветов (звонки идут по датам)
  const dayBackgroundIndex = useMemo(() => {
    const map = new Map<string, number>();
    let index = 0;
    for (const item of sortedCalls) {
      const ts = item.call.timestamp;
      if (!ts) continue;
      const dateKey = new Date(ts).toISOString().slice(0, 10); // YYYY-MM-DD
      if (!map.has(dateKey)) {
        map.set(dateKey, index % 2);
        index++;
      }
    }
    return map;
  }, [sortedCalls]);

  const ROW_BG_LIGHT = "#ffffff";
  const ROW_BG_DARK = "#F1F1F3";

  // Сохраняем порядок при изменении
  useEffect(() => {
    saveColumnOrder(columnOrder);
  }, [columnOrder]);

  // Вычисляем отсортированный список колонок для рендеринга
  const orderedColumns = useMemo(() => {
    return columnOrder
      .map((key) => COLUMNS.find((col) => col.key === key))
      .filter((col): col is ColumnConfig => col !== undefined);
  }, [columnOrder]);

  // Обработчики drag-and-drop
  const handleDragStart = (e: React.DragEvent, columnKey: string) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", columnKey);
    // Добавляем визуальную обратную связь
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedColumn(null);
    setDragOverColumn(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (draggedColumn && draggedColumn !== columnKey) {
      setDragOverColumn(columnKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnKey: string) => {
    e.preventDefault();

    if (!draggedColumn || draggedColumn === targetColumnKey) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumnKey);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    // Перемещаем колонку
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);

    setColumnOrder(newOrder);
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Сброс порядка колонок к дефолтному
  const handleResetOrder = () => {
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    localStorage.removeItem(COLUMN_ORDER_STORAGE_KEY);
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleGenerateRecommendations = async (
    callId: number,
    existingRecommendations?: string[],
  ) => {
    if (isLoadingRecommendations) return;
    // Если рекомендации уже есть (сохранены) — показываем без повторной генерации
    if (existingRecommendations && existingRecommendations.length > 0) {
      setRecommendations(existingRecommendations);
      setRecommendationsCallId(callId);
      return;
    }
    try {
      setIsLoadingRecommendations(true);
      setRecommendationsCallId(callId);
      setRecommendations([]);

      const result = await api.calls.generateRecommendations({
        call_id: callId,
      });
      const recs =
        (result as { recommendations?: string[] })?.recommendations ?? [];
      setRecommendations(recs);
      onRecommendationsGenerated?.(callId, recs);
    } catch (error) {
      // Убрали console.error для продакшена
      alert("Не удалось сформировать рекомендации");
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const handleCloseRecommendations = () => {
    setRecommendationsCallId(null);
    setRecommendations([]);
  };

  if (calls.length === 0) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "#999" }}>
        <div style={{ fontSize: "14px" }}>Нет звонков для отображения</div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Column Toggle Button */}
      <div
        style={{
          position: "absolute",
          right: "16px",
          top: "-45px",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setShowColumnToggle(!showColumnToggle)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            display: "flex",
            alignItems: "center",
            color: "#999",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#333")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#999")}
          title="Настройка колонок"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>

        {showColumnToggle && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "40px",
              background: "white",
              border: "1px solid #eee",
              borderRadius: "8px",
              padding: "12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              width: "200px",
              zIndex: 100,
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                marginBottom: "8px",
                color: "#999",
                textTransform: "uppercase",
              }}
            >
              Видимость колонок
            </div>
            {orderedColumns.map((col) => (
              <label
                key={col.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "4px 0",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(col.key)}
                  onChange={() => toggleColumn(col.key)}
                />
                {col.label}
              </label>
            ))}
            <div
              style={{
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid #eee",
              }}
            >
              <button
                onClick={handleResetOrder}
                style={{
                  width: "100%",
                  padding: "6px 12px",
                  fontSize: "12px",
                  background: "#f5f5f5",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  cursor: "pointer",
                  color: "#666",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#eee";
                  e.currentTarget.style.color = "#333";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f5f5f5";
                  e.currentTarget.style.color = "#666";
                }}
              >
                Сбросить порядок колонок
              </button>
            </div>
          </div>
        )}
      </div>

      <table className="op-table">
        <thead>
          <tr>
            {orderedColumns.map(
              (col) =>
                visibleColumns.includes(col.key) && (
                  <th
                    key={col.key}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, col.key)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, col.key)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.key)}
                    style={{
                      cursor: col.sortKey ? "pointer" : "move",
                      userSelect: "none",
                      position: "relative",
                      backgroundColor:
                        dragOverColumn === col.key
                          ? "#f0f8ff"
                          : draggedColumn === col.key
                            ? "#f5f5f5"
                            : "transparent",
                      transition: "background-color 0.2s",
                      opacity: draggedColumn === col.key ? 0.5 : 1,
                    }}
                    onClick={() => col.sortKey && handleSort(col.sortKey)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {/* Иконка grip для перетаскивания */}
                      <span
                        style={{
                          cursor: "move",
                          color: "#999",
                          fontSize: "12px",
                          marginRight: "2px",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                        title="Перетащите для изменения порядка"
                        onMouseDown={(e) => {
                          // Предотвращаем клик при перетаскивании
                          e.stopPropagation();
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle cx="2" cy="2" r="1" fill="currentColor" />
                          <circle cx="6" cy="2" r="1" fill="currentColor" />
                          <circle cx="10" cy="2" r="1" fill="currentColor" />
                          <circle cx="2" cy="6" r="1" fill="currentColor" />
                          <circle cx="6" cy="6" r="1" fill="currentColor" />
                          <circle cx="10" cy="6" r="1" fill="currentColor" />
                          <circle cx="2" cy="10" r="1" fill="currentColor" />
                          <circle cx="6" cy="10" r="1" fill="currentColor" />
                          <circle cx="10" cy="10" r="1" fill="currentColor" />
                        </svg>
                      </span>

                      {col.label}

                      <div
                        className="op-tooltip"
                        style={{ display: "inline-flex" }}
                      >
                        <span className="info-icon" style={{ margin: 0 }}>
                          i
                        </span>
                        <div
                          className="tooltip-content"
                          style={{
                            fontWeight: 400,
                            textTransform: "none",
                            letterSpacing: 0,
                          }}
                        >
                          {col.tooltip}
                        </div>
                      </div>

                      {col.sortKey && sortConfig?.key === col.sortKey && (
                        <span style={{ fontSize: "10px", color: "#333" }}>
                          {sortConfig.order === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </div>
                  </th>
                ),
            )}
          </tr>
        </thead>
        <tbody>
          {sortedCalls.map((item) => {
            const { call, transcript, evaluation } = item;
            const isMissed =
              call.duration_seconds === 0 &&
              (call.direction === "Входящий" || call.direction === "incoming");

            const directionLabel =
              call.direction === "incoming" || call.direction === "Входящий"
                ? "ВХОДЯЩИЙ"
                : "ИСХОДЯЩИЙ";
            const directionClass =
              directionLabel === "ВХОДЯЩИЙ"
                ? "badge-yellow-op"
                : "badge-black-op";

            // Рендерим ячейки в порядке columnOrder
            const renderCell = (colKey: string) => {
              if (!visibleColumns.includes(colKey)) return null;

              switch (colKey) {
                case "type":
                  return (
                    <td key={colKey} style={{ width: "120px" }}>
                      <span className={`op-badge ${directionClass}`}>
                        {directionLabel}
                      </span>
                    </td>
                  );
                case "number":
                  return (
                    <td key={colKey}>
                      {call.customer_name ? (
                        <>
                          {isMobileDevice() ? (
                            <Link
                              href={`/calls/${call.id}`}
                              className="call-link"
                              style={{
                                fontSize: "15px",
                                fontWeight: 700,
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              {call.customer_name}
                            </Link>
                          ) : (
                            <button
                              onClick={() => setSelectedCallId(call.id)}
                              className="call-link"
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                textDecoration: "none",
                                color: "inherit",
                                font: "inherit",
                                fontSize: "15px",
                                fontWeight: 700,
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              {call.customer_name}
                            </button>
                          )}
                          <div style={{ fontSize: "11px", color: "#999" }}>
                            {call.number || ""}
                          </div>
                        </>
                      ) : (
                        <>
                          {isMobileDevice() ? (
                            <Link
                              href={`/calls/${call.id}`}
                              className="call-link"
                            >
                              {call.number}
                            </Link>
                          ) : (
                            <button
                              onClick={() => setSelectedCallId(call.id)}
                              className="call-link"
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                cursor: "pointer",
                                textDecoration: "none",
                                color: "inherit",
                                font: "inherit",
                              }}
                            >
                              {call.number}
                            </button>
                          )}
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#999",
                              marginTop: "2px",
                            }}
                          >
                            {call.internal_number || ""}
                          </div>
                        </>
                      )}
                    </td>
                  );
                case "manager":
                  return (
                    <td key={colKey}>
                      <span style={{ color: "#555", fontWeight: 500 }}>
                        {call.manager_name || call.operator_name || "—"}
                      </span>
                    </td>
                  );
                case "status":
                  return (
                    <td key={colKey}>
                      <span
                        className={`op-badge ${isMissed ? "badge-red-op" : "badge-green-op"}`}
                      >
                        {isMissed ? "ПРОПУЩЕН" : "ПРИНЯТ"}
                      </span>
                    </td>
                  );
                case "date":
                  return (
                    <td
                      key={colKey}
                      style={{ whiteSpace: "nowrap", color: "#555" }}
                    >
                      {formatTimestamp(call.timestamp)}
                    </td>
                  );
                case "score":
                  return (
                    <td key={colKey}>
                      {evaluation?.value_score ? (
                        <div className="op-tooltip">
                          <div
                            style={{
                              color: "#FFD600",
                              fontSize: "16px",
                              letterSpacing: "2px",
                            }}
                          >
                            {"★".repeat(evaluation.value_score)}
                            {"☆".repeat(5 - evaluation.value_score)}
                          </div>
                          {evaluation.value_explanation && (
                            <div className="tooltip-content">
                              <strong>Обоснование:</strong>
                              <br />
                              {evaluation.value_explanation}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: "#FFD600", opacity: 0.3 }}>
                          ☆☆☆☆☆
                        </span>
                      )}
                    </td>
                  );
                case "summary":
                  return (
                    <td key={colKey}>
                      {transcript?.summary ? (
                        <div
                          className="op-tooltip"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span
                            style={{
                              maxWidth: "220px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              color: "#666",
                            }}
                          >
                            {transcript.summary}
                          </span>
                          <span className="info-icon">i</span>
                          <div
                            className="tooltip-content"
                            style={{ width: "280px" }}
                          >
                            <strong>Вывод:</strong>
                            <br />
                            {transcript.summary}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: "#ccc" }}>—</span>
                      )}
                    </td>
                  );
                case "record":
                  return (
                    <td key={colKey} style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        {call.filename && (
                          <>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleGenerateRecommendations(
                                  call.id,
                                  evaluation?.manager_recommendations,
                                );
                              }}
                              disabled={
                                isLoadingRecommendations &&
                                recommendationsCallId === call.id
                              }
                              title="Сформировать рекомендации"
                              style={{
                                background: "none",
                                border: "none",
                                cursor:
                                  isLoadingRecommendations &&
                                  recommendationsCallId === call.id
                                    ? "wait"
                                    : "pointer",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "50%",
                                width: "24px",
                                height: "24px",
                                transition: "background 0.2s",
                                opacity:
                                  isLoadingRecommendations &&
                                  recommendationsCallId === call.id
                                    ? 0.6
                                    : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (
                                  !isLoadingRecommendations ||
                                  recommendationsCallId !== call.id
                                ) {
                                  e.currentTarget.style.background = "#f0f0f0";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "none";
                              }}
                            >
                              {isLoadingRecommendations &&
                              recommendationsCallId === call.id ? (
                                <div
                                  style={{
                                    width: "14px",
                                    height: "14px",
                                    border: "2px solid #f0f0f0",
                                    borderTop: "2px solid #F7931E",
                                    borderRadius: "50%",
                                    animation: "spin 0.8s linear infinite",
                                  }}
                                ></div>
                              ) : (
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  style={{ color: "#F7931E" }}
                                >
                                  <path
                                    d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.22-1.21 4.15-3 5.19V17H9v-2.81c-1.79-1.04-3-2.97-3-5.19a6 6 0 0 1 6-6z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                  />
                                </svg>
                              )}
                            </button>
                            <button
                              className="record-btn"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (onPlay && call.filename) {
                                  onPlay(call.filename, call.number || "");
                                } else if (call.filename) {
                                  window.open(
                                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/records/${call.filename}`,
                                    "_blank",
                                  );
                                }
                              }}
                              title="Прослушать запись"
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                                style={{ marginLeft: "2px" }}
                              >
                                <path
                                  d="M8 5 L8 19 L19 12 Z"
                                  fill="currentColor"
                                />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  );
                case "duration":
                  return (
                    <td key={colKey} style={{ fontWeight: 600, color: "#444" }}>
                      {formatDuration(call.duration_seconds)}
                    </td>
                  );
                default:
                  return null;
              }
            };

            const dateKey = call.timestamp
              ? new Date(call.timestamp).toISOString().slice(0, 10)
              : "";
            const dayIndex = dateKey ? dayBackgroundIndex.get(dateKey) : 0;
            const rowBg = dayIndex === 1 ? ROW_BG_DARK : ROW_BG_LIGHT;

            return (
              <tr key={call.id} style={{ backgroundColor: rowBg }}>
                {columnOrder.map((colKey) => renderCell(colKey))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {selectedCallId && (
        <CallDetailModal
          callId={selectedCallId}
          onClose={() => setSelectedCallId(null)}
          user={user}
          onCallDeleted={(callId) => {
            setSelectedCallId(null);
            if (onCallDeleted) {
              onCallDeleted(callId);
            }
          }}
        />
      )}

      <RecommendationsModal
        isOpen={recommendationsCallId !== null}
        onClose={handleCloseRecommendations}
        recommendations={recommendations}
        isLoading={isLoadingRecommendations}
      />
    </div>
  );
}
