"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { type AccessFormData, accessFormSchema } from "../schemas";

interface AccessSectionProps {
  baseUrl: string;
  apiKeyPasswordSet: boolean;
  syncFromDate: string;
  saving: boolean;
  testing: boolean;
  testMessage?: string;
  onSaveAccess: (data: AccessFormData) => Promise<void>;
  onTest: (baseUrl: string, apiKey?: string) => Promise<void>;
}

export function AccessSection({
  baseUrl,
  apiKeyPasswordSet,
  syncFromDate,
  saving,
  testing,
  testMessage = "",
  onSaveAccess,
  onTest,
}: AccessSectionProps) {
  const minDate = (() => {
    const now = new Date();
    const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const d = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      Math.min(now.getDate(), lastDayOfPrevMonth),
    );
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();

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
    <Card>
      <CardHeader>
        <CardTitle>Доступ к API</CardTitle>
        <CardDescription>Укажите base URL и API key из личного кабинета MegaPBX</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="baseUrl"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Base URL</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://vats919602.megapbx.ru/crmapi/v1"
                        type="url"
                        inputMode="url"
                        autoComplete="url"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>API key</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        inputMode="text"
                        autoComplete="off"
                        placeholder={
                          apiKeyPasswordSet ? "•••••••• (не менять)" : "Ключ авторизации"
                        }
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Ключ хранится в зашифрованном виде
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
                    <FormLabel>Импорт звонков с даты</FormLabel>
                    <FormControl>
                      <DatePicker
                        id="megapbx-sync-from-date"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Выберите дату"
                        minDate={minDate}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Импорт за последний месяц</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void (async () => {
                    const validated = await form.trigger(["baseUrl", "apiKey"]);
                    if (!validated) return;
                    const parsed = accessFormSchema.safeParse(form.getValues());
                    if (!parsed.success) return;
                    const normalizedBaseUrl = parsed.data.baseUrl?.trim() ?? "";
                    const normalizedApiKey =
                      parsed.data.apiKey?.trim() === "" ? undefined : parsed.data.apiKey?.trim();
                    await onTest(normalizedBaseUrl, normalizedApiKey);
                  })();
                }}
                disabled={testing || !form.watch("baseUrl")?.trim()}
              >
                {testing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Проверить API
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Сохранить
              </Button>
            </div>
            {testMessage ? (
              <div
                className={`rounded-md border px-3 py-2 text-sm ${
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
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
