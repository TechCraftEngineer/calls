"use client";

import { useEffect } from "react";
import { PROMPT_KEYS } from "@/components/features/settings/constants";
import { useSettings } from "@/components/features/settings/hooks";
import PromptSection from "@/components/features/settings/prompt-section";
import SettingsPageShell from "@/components/features/settings/settings-page-shell";

export default function SettingsPromptsPage() {
  const { state, loadSettings, handleSave, updatePrompt } = useSettings();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (state.loading) {
    return (
      <SettingsPageShell>
        <div className="flex items-center justify-center py-24">
          <div className="text-muted-foreground">Загрузка…</div>
        </div>
      </SettingsPageShell>
    );
  }

  return (
    <SettingsPageShell>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Промпты ИИ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Настройки анализа звонков и оценки качества
        </p>
      </header>

      <div className="space-y-6">
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
      </div>

      <SettingsPageShell.Footer
        onSave={handleSave}
        onCancel={loadSettings}
        saving={state.saving}
      />
    </SettingsPageShell>
  );
}
