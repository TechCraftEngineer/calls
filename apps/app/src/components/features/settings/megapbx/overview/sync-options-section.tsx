"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

interface SyncOptionsSectionProps {
  megaPbx: {
    syncEmployees: boolean;
    syncNumbers: boolean;
    syncCalls: boolean;
    syncRecordings: boolean;
    webhooksEnabled: boolean;
  };
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
  megaPbx,
  saving,
  onSaveSyncOptions,
}: SyncOptionsSectionProps) {
  const syncCallsDefault = megaPbx.syncCalls;
  const syncRecordingsDefault = syncCallsDefault || megaPbx.syncRecordings;

  const form = useForm<SyncOptionsFormData>({
    resolver: zodResolver(syncOptionsFormSchema) as never,
    defaultValues: {
      syncCalls: syncCallsDefault,
      syncEmployees: megaPbx.syncEmployees,
      syncNumbers: megaPbx.syncNumbers,
      syncRecordings: syncRecordingsDefault,
      webhooksEnabled: megaPbx.webhooksEnabled,
    },
  });

  useEffect(() => {
    const syncCalls = megaPbx.syncCalls;
    const syncRecordings = syncCalls || megaPbx.syncRecordings;
    form.reset({
      syncEmployees: megaPbx.syncEmployees,
      syncNumbers: megaPbx.syncNumbers,
      syncCalls,
      syncRecordings,
      webhooksEnabled: megaPbx.webhooksEnabled,
    });
  }, [
    megaPbx.syncEmployees,
    megaPbx.syncNumbers,
    megaPbx.syncCalls,
    megaPbx.syncRecordings,
    megaPbx.webhooksEnabled,
    form,
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Что синхронизировать</CardTitle>
        <CardDescription>Включите только те данные, которые реально нужны</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <FieldGroup className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {SYNC_OPTIONS.map(([key, label, hint, Icon]) => {
              const fieldName = KEY_TO_FIELD[key];
              if (!fieldName) return null;
              return (
                <FormField
                  key={key}
                  control={form.control}
                  name={fieldName}
                  render={({ field }) => (
                    <FieldLabel htmlFor={key} className="p-0!">
                      <Field orientation="horizontal">
                        <FieldContent>
                          <FieldTitle className="flex items-center gap-2">
                            <div className="flex shrink-0 items-center justify-center rounded-md border bg-background p-1.5 shadow-sm">
                              <Icon aria-hidden className="size-3.5" />
                            </div>
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="text-xs font-semibold">{label}</span>
                              <FieldDescription className="mt-0 text-[11px] text-muted-foreground">
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
                              const previousValue = field.value;
                              field.onChange(checked);
                              const nextValues: SyncOptionsFormData = {
                                ...form.getValues(),
                                [fieldName]: checked,
                              };
                              const payload: SyncOptionsFormData = {
                                ...nextValues,
                                syncRecordings: nextValues.syncCalls,
                              };
                              void (async () => {
                                try {
                                  await onSaveSyncOptions(payload);
                                } catch {
                                  field.onChange(previousValue);
                                } finally {
                                  form.reset({
                                    ...form.getValues(),
                                    syncRecordings: form.getValues().syncCalls,
                                  });
                                }
                              })();
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
        </Form>
      </CardContent>
    </Card>
  );
}
