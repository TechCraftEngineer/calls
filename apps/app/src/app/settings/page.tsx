"use client";

import { Button } from "@calls/ui";
import { useEffect } from "react";
import BackupSection from "@/components/features/settings/backup-section";
import { PROMPT_KEYS } from "@/components/features/settings/constants";
import { useSettings } from "@/components/features/settings/hooks";
import IntegrationsSection from "@/components/features/settings/integrations-section";
import PromptSection from "@/components/features/settings/prompt-section";
import TelegramSection from "@/components/features/settings/telegram-section";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

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
          <div className="text-center py-[100px]">Загрузка…</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar user={currentUser} />
      <Header user={currentUser} />

      <main className="main-content">
        <header className="page-header mb-8">
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

        <div className="sticky bottom-0 bg-white py-5 border-t border-[#EEE] mt-8 flex justify-between items-center">
          <div className="text-[13px] text-[#666]">
            Выполните изменения и нажмите кнопку сохранения для применения
            настроек.
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="ghost-btn bg-white border-[#DDD] text-[#333]"
              onClick={() => loadSettings()}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={state.saving}
              className={
                state.saving
                  ? "bg-[#CCC] text-white border-none rounded-lg py-3 px-6 text-sm font-bold cursor-not-allowed"
                  : "bg-gradient-to-br from-[#FF6B35] to-[#F7931E] text-white border-none rounded-lg py-3 px-6 text-sm font-bold shadow-[0_2px_8px_rgba(255,107,53,0.3)]"
              }
            >
              {state.saving ? "Сохранение…" : "Сохранить все настройки"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
