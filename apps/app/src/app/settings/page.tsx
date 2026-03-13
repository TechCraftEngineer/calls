"use client";

import { useEffect } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import BackupSection from "./components/backup-section";
import IntegrationsSection from "./components/integrations-section";
import PromptSection from "./components/prompt-section";
import TelegramSection from "./components/telegram-section";
import { PROMPT_KEYS } from "./constants/prompts";
import { useSettings } from "./hooks/useSettings";

export default function SettingsPage() {
  const {
    currentUser,
    state,
    loadSettings,
    handleSave,
    handleBackup,
    handleSendTest,
    updatePrompt,
  } = useSettings();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (state.loading) {
    return (
      <div className="app-container">
        <Sidebar user={currentUser} />
        <Header user={currentUser} />
        <main className="main-content">
          <div style={{ textAlign: "center", padding: "100px" }}>Загрузка…</div>
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

        <TelegramSection
          sendTestLoading={state.sendTestLoading}
          sendTestMessage={state.sendTestMessage}
          onSendTest={handleSendTest}
        />

        <IntegrationsSection
          prompts={state.prompts}
          onPromptChange={updatePrompt}
        />

        {Object.entries(PROMPT_KEYS).map(([key, title]) => (
          <PromptSection
            key={key}
            title={title}
            prompt={
              state.prompts[key] || {
                key,
                value: "",
                description: "",
                updated_at: undefined,
              }
            }
            onPromptChange={updatePrompt}
          />
        ))}

        {currentUser?.username === "admin@mango" && (
          <BackupSection
            backupLoading={state.backupLoading}
            onBackup={handleBackup}
          />
        )}

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
              disabled={state.saving}
              style={{
                background: state.saving
                  ? "#CCC"
                  : "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: state.saving ? "not-allowed" : "pointer",
                boxShadow: state.saving
                  ? "none"
                  : "0 2px 8px rgba(255, 107, 53, 0.3)",
                transition: "all 0.2s",
              }}
            >
              {state.saving ? "Сохранение…" : "Сохранить все настройки"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
