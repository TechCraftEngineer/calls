"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
  Form,
  FormControl,
  FormField,
  Switch,
} from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { SYNC_OPTIONS } from "../constants";
import { type SyncOptionsFormData, syncOptionsFormSchema } from "../schemas";
import { SectionBlock } from "../section-block";

interface SyncOptionsSectionProps {
  prompts: Record<string, { value?: string }>;
  saving: boolean;
  onSaveSyncOptions: (data: SyncOptionsFormData) => Promise<void>;
}

const KEY_TO_FIELD: Record<string, keyof SyncOptionsFormData> = {
  megapbx_sync_employees: "syncEmployees",
  megapbx_sync_numbers: "syncNumbers",
  megapbx_sync_calls: "syncCalls",
  megapbx_webhooks_enabled: "webhooksEnabled",
};

export function SyncOptionsSection({
  prompts,
  saving,
  onSaveSyncOptions,
}: SyncOptionsSectionProps) {
  const form = useForm<SyncOptionsFormData>({
    resolver: zodResolver(syncOptionsFormSchema) as never,
    // Записи всегда синхронизируются вместе со звонками.
    // Оставляем поле в payload для совместимости API.
    defaultValues: {
      syncCalls: prompts.megapbx_sync_calls?.value === "true",
      syncEmployees: prompts.megapbx_sync_employees?.value === "true",
      syncNumbers: prompts.megapbx_sync_numbers?.value === "true",
      syncRecordings: prompts.megapbx_sync_calls?.value === "true",
      webhooksEnabled: prompts.megapbx_webhooks_enabled?.value === "true",
    },
  });

  useEffect(() => {
    const syncCalls = prompts.megapbx_sync_calls?.value === "true";
    form.reset({
      syncEmployees: prompts.megapbx_sync_employees?.value === "true",
      syncNumbers: prompts.megapbx_sync_numbers?.value === "true",
      syncCalls,
      syncRecordings: syncCalls,
      webhooksEnabled: prompts.megapbx_webhooks_enabled?.value === "true",
    });
  }, [
    prompts.megapbx_sync_employees?.value,
    prompts.megapbx_sync_numbers?.value,
    prompts.megapbx_sync_calls?.value,
    prompts.megapbx_webhooks_enabled?.value,
    form,
  ]);

  return (
    <SectionBlock
      title="Что синхронизировать"
      description="Включите только те данные, которые реально нужны в рабочем пространстве."
    >
      <Form {...form}>
        <div className="contents">
          <FieldGroup className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {SYNC_OPTIONS.map(([key, label, hint, Icon]) => {
              const fieldName = KEY_TO_FIELD[key];
              if (!fieldName) return null;
              return (
                <FormField
                  key={key}
                  control={form.control}
                  name={fieldName}
                  render={({ field }) => (
                    <FieldLabel htmlFor={key} className="!p-0">
                      <Field orientation="horizontal">
                        <FieldContent>
                          <FieldTitle className="flex items-center gap-2">
                            <div className="bg-background border-border flex shrink-0 items-center justify-center rounded-md border p-1.5 shadow-xs shadow-black/5">
                              <Icon aria-hidden className="size-4" />
                            </div>
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="text-sm font-semibold">
                                {label}
                              </span>
                              <FieldDescription className="text-muted-foreground mt-0 text-xs">
                                {hint}
                              </FieldDescription>
                            </div>
                          </FieldTitle>
                        </FieldContent>
                        <FormControl>
                          <Switch
                            id={key}
                            size="sm"
                            checked={field.value}
                            disabled={saving}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              const nextValues: SyncOptionsFormData = {
                                ...form.getValues(),
                                [fieldName]: checked,
                              };
                              const payload: SyncOptionsFormData = {
                                ...nextValues,
                                syncRecordings: nextValues.syncCalls,
                              };
                              void onSaveSyncOptions(payload);
                            }}
                          />
                        </FormControl>
                      </Field>
                    </FieldLabel>
                  )}
                />
              );
            })}
          </FieldGroup>
        </div>
      </Form>
    </SectionBlock>
  );
}
