"use client";

import {
  Button,
  DatePicker,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PasswordInput,
} from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { type AccessFormData, accessFormSchema } from "../schemas";
import { SectionBlock } from "../section-block";

interface AccessSectionProps {
  baseUrl: string;
  apiKeyValue: string;
  apiKeyPasswordSet: boolean;
  syncFromDate: string;
  saving: boolean;
  testing: boolean;
  testMessage?: string;
  onSaveAccess: (data: AccessFormData) => Promise<void>;
  onTest: (baseUrl: string, apiKey: string) => Promise<void>;
}

export function AccessSection({
  baseUrl,
  apiKeyValue,
  apiKeyPasswordSet,
  syncFromDate,
  saving,
  testing,
  testMessage = "",
  onSaveAccess,
  onTest,
}: AccessSectionProps) {
  const form = useForm<AccessFormData>({
    resolver: zodResolver(accessFormSchema) as never,
    defaultValues: {
      baseUrl,
      apiKey: "",
      syncFromDate: syncFromDate || "",
    },
  });

  useEffect(() => {
    form.reset({
      baseUrl,
      apiKey: "",
      syncFromDate: syncFromDate || "",
    });
  }, [baseUrl, syncFromDate, form]);

  const onSubmit = async (data: AccessFormData) => {
    await onSaveAccess(data);
  };

  return (
    <SectionBlock
      title="Доступ к API"
      description="Укажите домен АТС и API key. Этого достаточно для проверки соединения и запуска синхронизации."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs text-muted-foreground">
                    Base URL / домен АТС
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://123456.megapbx.ru"
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      className="h-10"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Можно указать полный URL или только домен.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs text-muted-foreground">
                    API key
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      {...field}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      inputMode="text"
                      autoComplete="off"
                      placeholder={
                        apiKeyPasswordSet
                          ? "•••••••• (оставьте пустым, чтобы не менять)"
                          : "Ключ авторизации"
                      }
                      className="h-10"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Ключ хранится в зашифрованном виде.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="syncFromDate"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs text-muted-foreground">
                    Импорт звонков с даты
                  </FormLabel>
                  <FormControl>
                    <DatePicker
                      id="megapbx-sync-from-date"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Выберите дату"
                      className="h-10"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Используется как стартовая дата для первой загрузки истории
                    звонков.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const { baseUrl: b, apiKey: k } = form.getValues();
                void onTest(b ?? "", k ?? "");
              }}
              disabled={testing || !form.watch("baseUrl")?.trim()}
            >
              {testing ? "Проверка…" : "Проверить API"}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </form>
      </Form>
      {testMessage ? (
        <div
          className={`mt-4 rounded-lg border p-3 text-sm ${
            testMessage.includes("успешно")
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
          }`}
          role="status"
          aria-live="polite"
        >
          {testMessage}
        </div>
      ) : null}
    </SectionBlock>
  );
}
