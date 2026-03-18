"use client";

import {
  Button,
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
  Switch,
} from "@calls/ui";
import type { Prompt } from "../../types";
import { SYNC_OPTIONS } from "../constants";
import { SectionBlock } from "../section-block";

interface SyncOptionsSectionProps {
  prompts: Record<string, Prompt>;
  saving: boolean;
  onToggleChange: (key: string, checked: boolean) => void;
  onSaveSyncOptions: () => Promise<void>;
}

export function SyncOptionsSection({
  prompts,
  saving,
  onToggleChange,
  onSaveSyncOptions,
}: SyncOptionsSectionProps) {
  return (
    <SectionBlock
      title="Что синхронизировать"
      description="Включите только те данные, которые реально нужны в рабочем пространстве."
    >
      <FieldGroup className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {SYNC_OPTIONS.map(([key, label, hint, Icon]) => (
          <FieldLabel key={key} htmlFor={key} className="!p-0">
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle className="flex items-center gap-2">
                  <div className="bg-background border-border flex shrink-0 items-center justify-center rounded-md border p-1.5 shadow-xs shadow-black/5">
                    <Icon aria-hidden className="size-4" />
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-sm font-semibold">{label}</span>
                    <FieldDescription className="text-muted-foreground mt-0 text-xs">
                      {hint}
                    </FieldDescription>
                  </div>
                </FieldTitle>
              </FieldContent>
              <Switch
                id={key}
                size="sm"
                checked={prompts[key]?.value === "true"}
                onCheckedChange={(checked) =>
                  onToggleChange(key, checked === true)
                }
              />
            </Field>
          </FieldLabel>
        ))}
      </FieldGroup>
      <div className="mt-4">
        <Button type="button" onClick={onSaveSyncOptions} disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
      </div>
    </SectionBlock>
  );
}
