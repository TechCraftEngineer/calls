"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import api from "@/lib/api";
import { getCurrentUser, type User } from "@/lib/auth";

interface Prompt {
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
}

interface Model {
  name: string;
  id: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [prompts, setPrompts] = useState<Record<string, Prompt>>({});
  const [models, setModels] = useState<Model[]>([]);
  const [currentModel, setCurrentModel] = useState<string>("deepseek-chat");
  const [qualityThreshold, setQualityThreshold] = useState<string>("1");
  const [enableRecommendations, setEnableRecommendations] =
    useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [sendTestLoading, setSendTestLoading] = useState(false);
  const [sendTestMessage, setSendTestMessage] = useState("");

  const promptKeys = {
    quality: "Оценка качества работы",
    speaker_analysis_incoming: "Анализ спикеров (Вх)",
    speaker_analysis_outgoing: "Анализ спикеров (Исх)",
    value_outgoing: "Оценка ценности (Исх)",
    value_incoming: "Оценка ценности (Вх)",
    manager_recommendations: "Рекомендации менеджеру",
    customer_name_extraction: "Определение имени заказчика",
    telegram_bot_token: "Telegram Bot Token (для отчетов)",
    max_bot_token: "MAX Bot Token (для отчетов)",
  };

  const tokenOnlyKeys = ["telegram_bot_token", "max_bot_token"];

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        router.push("/");
        return;
      }
      setCurrentUser(user);

      const [promptsRes, modelsRes] = await Promise.all([
        api.get("/settings/prompts"),
        api.get("/settings/models"),
      ]);

      console.log("Prompts response:", promptsRes.data);
      console.log("Models response:", modelsRes.data);

      const promptsList: Prompt[] = promptsRes.data || [];
      const promptsMap: Record<string, Prompt> = {};

      // Сначала добавляем все промпты из ответа
      promptsList.forEach((p: Prompt) => {
        promptsMap[p.key] = p;
      });

      // Затем убеждаемся, что все нужные промпты есть (создаем пустые, если их нет)
      Object.keys(promptKeys).forEach((key) => {
        if (!promptsMap[key]) {
          promptsMap[key] = {
            key,
            value: "",
            description: "",
            updated_at: undefined,
          };
        }
      });

      setPrompts(promptsMap);
      console.log("Prompts map:", promptsMap);

      if (modelsRes.data) {
        const modelsData = modelsRes.data.models || {};
        const modelsArray = Object.values(modelsData) as Model[];
        setModels(modelsArray);
        console.log("Models array:", modelsArray);
        const currentModelValue =
          modelsRes.data.current_model || "deepseek-chat";
        setCurrentModel(currentModelValue);
        console.log("Current model:", currentModelValue);
      } else {
        // Fallback если API не вернул модели
        setModels([
          { id: "deepseek-chat", name: "DeepSeek Chat" },
          { id: "deepseek-reasoner", name: "DeepSeek Reasoner" },
        ]);
        setCurrentModel("deepseek-chat");
      }

      setQualityThreshold(
        promptsMap["quality_min_value_threshold"]?.value || "1",
      );
      setEnableRecommendations(
        promptsMap["enable_manager_recommendations"]?.value === "true",
      );
    } catch (error: any) {
      console.error("Failed to load settings:", error);
      if (error.response?.status === 403) {
        alert("Доступ запрещен.");
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updates: any = {
        deepseek_model: currentModel,
        quality_min_value_threshold: parseInt(qualityThreshold),
        enable_manager_recommendations: enableRecommendations,
        prompts: {},
      };

      Object.keys(promptKeys).forEach((key) => {
        const prompt = prompts[key];
        if (prompt) {
          updates.prompts[key] = {
            value: prompt.value || "",
            description: prompt.description || "",
          };
        }
      });

      console.log("Saving updates:", updates);
      await api.put("/settings/prompts", updates);
      alert("Настройки успешно сохранены");
      await loadSettings();
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      alert("Ошибка при сохранении настроек");
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    if (backupLoading) return;
    try {
      setBackupLoading(true);
      const res = await api.post("/settings/backup");
      const path = res.data?.path ?? "";
      alert(`Резервная копия создана.\n\nПуть на сервере: ${path}`);
    } catch (error: any) {
      const msg =
        error.response?.data?.detail ??
        error.message ??
        "Ошибка при создании копии";
      alert(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setBackupLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{[^}]+\}/g);
    return matches ? [...new Set(matches)] : [];
  };

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar user={currentUser} />
        <Header user={currentUser} />
        <main className="main-content">
          <div style={{ textAlign: "center", padding: "100px" }}>
            Загрузка...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar user={currentUser} />
      <Header user={currentUser} />

      <main className="main-content">
        <header className="page-header" style={{ marginBottom: "32px" }}>
          <h1 className="page-title">Настройки системы</h1>
          <p className="page-subtitle">Управление параметрами ИИ и промптами</p>
        </header>

        {/* Отчёты в Telegram — быстрая кнопка и ссылка на полные настройки */}
        <section className="card" style={{ marginBottom: "24px" }}>
          <div
            className="section-title"
            style={{
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "18px" }}>📊</span> Отчёты в Telegram
          </div>
          <p style={{ marginBottom: "16px", fontSize: "14px", color: "#555" }}>
            Подписки на ежедневный/еженедельный/ежемесячный отчёт и опция «не
            отправлять в выходные» настраиваются на странице{" "}
            <Link
              href="/statistics?tab=settings"
              style={{ color: "#FF6B35", fontWeight: 600 }}
            >
              Статистика
            </Link>{" "}
            → вкладка «Настройки отчетов».
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              disabled={sendTestLoading}
              onClick={async () => {
                setSendTestMessage("");
                setSendTestLoading(true);
                try {
                  await api.post("/reports/send-test-telegram");
                  setSendTestMessage("Отчёт отправлен в Telegram");
                  setTimeout(() => setSendTestMessage(""), 4000);
                } catch (err: unknown) {
                  const e = err as {
                    response?: { data?: { detail?: string } };
                  };
                  const d = e.response?.data?.detail;
                  setSendTestMessage(
                    typeof d === "string"
                      ? d
                      : "Не удалось отправить. Укажите Telegram Chat ID в Настройках отчётов.",
                  );
                } finally {
                  setSendTestLoading(false);
                }
              }}
              style={{
                padding: "10px 20px",
                border: "none",
                borderRadius: "8px",
                background: sendTestLoading
                  ? "#ccc"
                  : "linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)",
                color: "white",
                fontWeight: 600,
                cursor: sendTestLoading ? "not-allowed" : "pointer",
                fontSize: "14px",
              }}
            >
              {sendTestLoading
                ? "Отправка..."
                : "Отправить тестовый отчёт в Telegram"}
            </button>
            <Link
              href="/statistics?tab=settings"
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #FF6B35",
                color: "#FF6B35",
                fontWeight: 600,
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              Перейти к настройкам отчётов
            </Link>
            {sendTestMessage && (
              <span
                style={{
                  color: sendTestMessage.includes("отправлен")
                    ? "#4CAF50"
                    : "#FF5252",
                  fontSize: "14px",
                }}
              >
                {sendTestMessage}
              </span>
            )}
          </div>
        </section>

        {/* Global Parameters Section */}
        <section className="card" style={{ marginBottom: "24px" }}>
          <div
            className="section-title"
            style={{
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "16px" }}>⚙️</span> Глобальные параметры
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div className="filter-item">
              <label className="filter-label">МОДЕЛЬ DEEPSEEK</label>
              <select
                className="select-input"
                value={currentModel}
                onChange={(e) => {
                  console.log("Model changed to:", e.target.value);
                  setCurrentModel(e.target.value);
                }}
                style={{ cursor: "pointer" }}
              >
                {models.length > 0 ? (
                  models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))
                ) : (
                  <option value="deepseek-chat">DeepSeek Chat</option>
                )}
              </select>
            </div>

            <div className="filter-item">
              <label className="filter-label">
                ПОРОГ ЦЕННОСТИ ДЛЯ ОЦЕНКИ КАЧЕСТВА (0-5)
              </label>
              <input
                type="number"
                min="0"
                max="5"
                className="text-input"
                value={qualityThreshold}
                onChange={(e) => setQualityThreshold(e.target.value)}
                style={{ width: "100px" }}
              />
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "#666",
                fontStyle: "italic",
                marginTop: "-12px",
              }}
            >
              * Оценка качества будет выполняться только для звонков с ценностью
              не ниже указанного порога.
            </div>

            <div className="filter-item">
              <label
                className="filter-label"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={enableRecommendations}
                  onChange={(e) => setEnableRecommendations(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                ВКЛЮЧИТЬ БЛОК РЕКОМЕНДАЦИЙ ДЛЯ МЕНЕДЖЕРА
              </label>
              <div
                style={{
                  fontSize: "13px",
                  color: "#666",
                  fontStyle: "italic",
                  marginTop: "4px",
                  marginLeft: "30px",
                }}
              >
                * Если включено, ИИ будет предлагать вопросы, которые менеджер
                мог бы задать клиенту.
              </div>
            </div>
          </div>
        </section>

        {/* Prompt Sections */}
        {Object.entries(promptKeys).map(([key, title]) => {
          // Получаем промпт из состояния или создаем пустой
          const prompt = prompts[key] || {
            key,
            value: "",
            description: "",
            updated_at: undefined,
          };
          const isTokenOnly = tokenOnlyKeys.includes(key);
          const variables = extractVariables(prompt.value || "");

          return (
            <section
              key={key}
              className="card"
              style={{ marginBottom: "24px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h3 className="section-title" style={{ margin: 0 }}>
                    {title}
                  </h3>
                  {prompt.updated_at && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#999",
                        marginTop: "4px",
                      }}
                    >
                      Обновлено: {formatDate(prompt.updated_at)}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: "18px", cursor: "pointer" }}>✏️</span>
              </div>

              {isTokenOnly ? (
                <div className="filter-item">
                  <label className="filter-label">Токен</label>
                  <input
                    type="password"
                    className="text-input"
                    value={prompt.value || ""}
                    onChange={(e) => {
                      const updated = { ...prompts };
                      updated[key] = { ...prompt, value: e.target.value };
                      setPrompts(updated);
                    }}
                    placeholder="Введите токен бота"
                    autoComplete="off"
                  />
                </div>
              ) : (
                <>
                  {variables.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <div
                        className="filter-label"
                        style={{ marginBottom: "8px" }}
                      >
                        Доступные переменные:
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        {variables.map((varName, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: "4px 12px",
                              background: "#F5F5F7",
                              borderRadius: "16px",
                              fontSize: "12px",
                              fontFamily: "monospace",
                              color: "#333",
                              border: "1px solid #E0E0E0",
                            }}
                          >
                            {varName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="filter-item" style={{ marginBottom: "16px" }}>
                    <label className="filter-label">ОПИСАНИЕ</label>
                    <input
                      type="text"
                      className="text-input"
                      value={prompt.description || ""}
                      onChange={(e) => {
                        const updated = { ...prompts };
                        updated[key] = {
                          ...prompt,
                          description: e.target.value,
                        };
                        setPrompts(updated);
                      }}
                      placeholder="Описание промпта"
                    />
                  </div>

                  <div className="filter-item">
                    <label className="filter-label">ТЕКСТ ПРОМПТА</label>
                    <textarea
                      className="text-input"
                      value={prompt.value || ""}
                      onChange={(e) => {
                        const updated = { ...prompts };
                        updated[key] = { ...prompt, value: e.target.value };
                        setPrompts(updated);
                      }}
                      placeholder="Введите текст промпта"
                      style={{
                        minHeight: "300px",
                        resize: "vertical",
                        fontFamily: "monospace",
                        fontSize: "13px",
                        lineHeight: "1.6",
                      }}
                    />
                  </div>
                </>
              )}
            </section>
          );
        })}

        {/* Database backup — только для admin@mango */}
        {currentUser?.username === "admin@mango" && (
          <section className="card" style={{ marginBottom: "24px" }}>
            <div
              className="section-title"
              style={{
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "16px" }}>💾</span> Резервная копия базы
            </div>
            <p
              style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}
            >
              Создать копию базы данных и сохранить её на сервере.
            </p>
            <button
              type="button"
              onClick={handleBackup}
              disabled={backupLoading}
              style={{
                background: backupLoading
                  ? "#CCC"
                  : "linear-gradient(135deg, #2d7d46 0%, #1e5c34 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: backupLoading ? "not-allowed" : "pointer",
              }}
            >
              {backupLoading ? "Создание копии..." : "Копия базы"}
            </button>
          </section>
        )}

        {/* Footer with Save Buttons */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            background: "white",
            padding: "20px 0",
            borderTop: "1px solid #EEE",
            marginTop: "32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "13px", color: "#666" }}>
            Выполните изменения и нажмите кнопку сохранения для применения
            настроек.
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              className="ghost-btn"
              onClick={() => loadSettings()}
              style={{
                background: "white",
                border: "1px solid #DDD",
                color: "#333",
              }}
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: saving
                  ? "#CCC"
                  : "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving
                  ? "none"
                  : "0 2px 8px rgba(255, 107, 53, 0.3)",
                transition: "all 0.2s",
              }}
            >
              {saving ? "Сохранение..." : "Сохранить все настройки"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
