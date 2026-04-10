"use client";

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, PasswordInput, toast } from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useORPC } from "@/orpc/react";
import type { ModalProps } from "./types";

const apiSchema = z.object({
  baseUrl: z.string().url("Введите корректный URL"),
  apiKey: z.string().min(1, "API Key обязателен"),
});

export function ApiModal({ open, onOpenChange, onComplete }: ModalProps) {
  const orpc = useORPC();
  const [testing, setTesting] = useState(false);

  const form = useForm({
    resolver: zodResolver(apiSchema),
    mode: "onChange",
    defaultValues: { baseUrl: "", apiKey: "" },
  });

  const handleTestAndSave = async () => {
    const values = form.getValues();
    setTesting(true);
    try {
      const result = await orpc.settings.testPbx.mutate({
        baseUrl: values.baseUrl.trim(),
        apiKey: values.apiKey.trim(),
      });
      const ok = result && typeof result === "object" && "success" in result && result.success;
      if (ok) {
        await orpc.settings.updatePbxAccess.mutate({
          enabled: true,
          baseUrl: values.baseUrl.trim(),
          apiKey: values.apiKey.trim(),
        });
        onComplete();
      } else {
        toast.error("Проверка не пройдена");
      }
    } catch (_err) {
      toast.error("Ошибка подключения");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Подключение к API Мегафон</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Base URL</label>
            <Input {...form.register("baseUrl")} placeholder="https://...megapbx.ru/crmapi/v1" />
            {form.formState.errors.baseUrl && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.baseUrl.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">API Key</label>
            <PasswordInput {...form.register("apiKey")} placeholder="Ключ авторизации" />
          </div>
        </div>
        <Button
          onClick={handleTestAndSave}
          disabled={testing || !form.formState.isValid}
          className="w-full"
        >
          {testing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Проверить и сохранить
        </Button>
      </DialogContent>
    </Dialog>
  );
}
