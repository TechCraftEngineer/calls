"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useORPC } from "@/orpc/react";

const PROMPT_STRUCTURE_EXAMPLE = `Ты эксперт по анализу телефонных переговоров. Оцени звонок по двум критериям.

## 1. Ценность звонка (value_score, 1–5)
Оцени бизнес-ценность разговора:
- 5 — Высокая ценность
- 4 — Значительная
- 3 — Средняя
- 2 — Низкая
- 1 — Минимальная

value_explanation — 1–2 предложения: почему такая оценка.

## 2. Качество работы менеджера (manager_score, 1–5)
Оцени коммуникацию менеджера.

manager_feedback — 1–2 предложения: что сделано хорошо, что улучшить.

Отвечай только на русском.`;

const BASE_TEMPLATES = [
  { slug: "sales", name: "Продажи" },
  { slug: "support", name: "Поддержка" },
  { slug: "general", name: "Общий" },
] as const;

interface TemplateFormModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  template?: {
    id: string;
    slug: string;
    name: string;
    description: string;
    systemPrompt: string;
  } | null;
  /** Pre-fill when creating from built-in template */
  initialPrompt?: string;
  initialName?: string;
}

export function TemplateFormModal({
  open,
  onClose,
  mode,
  template,
  initialPrompt,
  initialName,
}: TemplateFormModalProps) {
  const orpc = useORPC();
  const queryClient = useQueryClient();
  const [name, setName] = useState(template?.name ?? initialName ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [systemPrompt, setSystemPrompt] = useState(
    template?.systemPrompt ?? initialPrompt ?? "",
  );
  const [baseTemplateSlug, setBaseTemplateSlug] = useState<string>("");

  useEffect(() => {
    if (open) {
      setName(template?.name ?? initialName ?? "");
      setDescription(template?.description ?? "");
      setSystemPrompt(template?.systemPrompt ?? initialPrompt ?? "");
      setBaseTemplateSlug("");
    }
  }, [open, template, initialPrompt, initialName]);

  const { data: baseTemplateContent } = useQuery({
    ...orpc.settings.getEvaluationTemplateBySlug.queryOptions({
      input: { slug: baseTemplateSlug },
    }),
    enabled: !!baseTemplateSlug && mode === "create",
  });

  useEffect(() => {
    if (baseTemplateContent && baseTemplateSlug) {
      setSystemPrompt(baseTemplateContent.systemPrompt);
      if (!name) setName(`${baseTemplateContent.name} (копия)`);
    }
  }, [baseTemplateContent, baseTemplateSlug, name]);

  const createMutation = useMutation(
    orpc.settings.createEvaluationTemplate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getEvaluationTemplates.queryKey(),
        });
        toast.success("Шаблон создан");
        onClose();
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Не удалось создать шаблон",
        );
      },
    }),
  );

  const updateMutation = useMutation(
    orpc.settings.updateEvaluationTemplate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getEvaluationTemplates.queryKey(),
        });
        toast.success("Шаблон сохранён");
        onClose();
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Не удалось сохранить шаблон",
        );
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !systemPrompt.trim()) return;
    if (mode === "create") {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        systemPrompt: systemPrompt.trim(),
      });
    } else if (template) {
      updateMutation.mutate({
        id: template.id,
        name: name.trim(),
        description: description.trim() || null,
        systemPrompt: systemPrompt.trim(),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Создать шаблон" : "Редактировать шаблон"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Название</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Продажи B2B"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description">Описание (необязательно)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание шаблона"
              className="mt-1"
            />
          </div>
          {mode === "create" && (
            <div>
              <Label>Взять за основу встроенный шаблон</Label>
              <Select
                value={baseTemplateSlug}
                onValueChange={setBaseTemplateSlug}
              >
                <SelectTrigger className="mt-1 w-full max-w-xs">
                  <SelectValue placeholder="Выберите для копирования промпта" />
                </SelectTrigger>
                <SelectContent>
                  {BASE_TEMPLATES.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Скопирует промпт встроенного шаблона — можно отредактировать
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="systemPrompt">Системный промпт</Label>
            <p className="mb-1 text-xs text-muted-foreground">
              Инструкции для AI. Обязательно укажите value_score,
              value_explanation, manager_score, manager_feedback.
            </p>
            <textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={PROMPT_STRUCTURE_EXAMPLE}
              required
              rows={14}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
            />
          </div>

          <details className="rounded-md border bg-muted/30 p-3">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              Пример структуры промпта
            </summary>
            <pre className="mt-3 whitespace-pre-wrap text-xs font-mono text-muted-foreground">
              {PROMPT_STRUCTURE_EXAMPLE}
            </pre>
          </details>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Сохранение…"
                : mode === "create"
                  ? "Создать"
                  : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
