"use client";

import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  Input,
  Textarea,
  toast,
} from "@calls/ui";
import { useIsMobile } from "@calls/ui/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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

const MAX_PROMPT_LENGTH = 10000;
const PROMPT_WARNING_THRESHOLD = 9500;

const BASE_TEMPLATES = [
  { slug: "sales", name: "Продажи", desc: "B2B-продажи, сделки, возражения" },
  { slug: "support", name: "Поддержка", desc: "Техподдержка, решение проблем" },
  { slug: "general", name: "Общий", desc: "Универсальный шаблон" },
] as const;

const createSchema = z.object({
  name: z.string().min(1, "Введите название").max(200, "Не более 200 символов"),
  description: z.string().max(500, "Не более 500 символов").optional(),
  systemPrompt: z
    .string()
    .min(1, "Промпт обязателен")
    .max(MAX_PROMPT_LENGTH, `Не более ${MAX_PROMPT_LENGTH.toLocaleString()} символов`)
    .refine((prompt) => {
      const lower = prompt.toLowerCase();
      return (
        lower.includes("value_score") &&
        lower.includes("manager_score") &&
        lower.includes("value_explanation") &&
        lower.includes("manager_feedback")
      );
    }, "Промпт должен содержать: value_score, manager_score, value_explanation, manager_feedback"),
});

type CreateFormData = z.infer<typeof createSchema>;

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
  const isMobile = useIsMobile();

  const [baseTemplateSlug, setBaseTemplateSlug] = useState<string>("");

  const form = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    mode: "onBlur",
    defaultValues: {
      name: template?.name ?? initialName ?? "",
      description: template?.description ?? "",
      systemPrompt: template?.systemPrompt ?? initialPrompt ?? "",
    },
  });

  const { watch, setValue, reset } = form;

  useEffect(() => {
    if (open) {
      reset({
        name: template?.name ?? initialName ?? "",
        description: template?.description ?? "",
        systemPrompt: template?.systemPrompt ?? initialPrompt ?? "",
      });
      setBaseTemplateSlug("");
    }
  }, [open, template, initialPrompt, initialName, reset]);

  const { data: baseTemplateContent } = useQuery({
    ...orpc.settings.getEvaluationTemplateBySlug.queryOptions({
      input: { slug: baseTemplateSlug },
    }),
    enabled: !!baseTemplateSlug && mode === "create",
  });

  useEffect(() => {
    if (baseTemplateContent && baseTemplateSlug) {
      setValue("systemPrompt", baseTemplateContent.systemPrompt);
      if (!form.getValues("name")) {
        setValue("name", `${baseTemplateContent.name} (копия)`);
      }
    }
  }, [baseTemplateContent, baseTemplateSlug, setValue, form]);

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
        toast.error(err instanceof Error ? err.message : "Не удалось создать шаблон");
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
        toast.error(err instanceof Error ? err.message : "Не удалось сохранить шаблон");
      },
    }),
  );

  const onSubmit = (data: CreateFormData) => {
    if (mode === "create") {
      createMutation.mutate({
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        systemPrompt: data.systemPrompt.trim(),
      });
    } else if (template?.id) {
      updateMutation.mutate({
        id: template.id,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        systemPrompt: data.systemPrompt.trim(),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const promptLength = watch("systemPrompt")?.length ?? 0;

  const formContent = (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {mode === "create" && (
        <FieldGroup>
          <FieldLabel>Начать с шаблона</FieldLabel>
          <FieldDescription>
            Выберите встроенный шаблон — промпт скопируется, его можно отредактировать
          </FieldDescription>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            {BASE_TEMPLATES.map((t) => (
              <Button
                key={t.slug}
                type="button"
                variant={baseTemplateSlug === t.slug ? "default" : "outline"}
                onClick={() => setBaseTemplateSlug(t.slug)}
              >
                {t.name}
              </Button>
            ))}
          </div>
        </FieldGroup>
      )}

      <Field orientation="vertical">
        <FieldLabel htmlFor="name">Название</FieldLabel>
        <Input
          id="name"
          placeholder="Например: Продажи B2B"
          aria-invalid={!!form.formState.errors.name}
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </Field>

      <Field orientation="vertical">
        <FieldLabel htmlFor="description">Описание</FieldLabel>
        <FieldDescription>Краткое описание для списка шаблонов</FieldDescription>
        <Input
          id="description"
          placeholder="Необязательно"
          aria-invalid={!!form.formState.errors.description}
          {...form.register("description")}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
        )}
      </Field>

      <Field orientation="vertical">
        <FieldLabel htmlFor="systemPrompt">Системный промпт</FieldLabel>
        <FieldDescription>
          Инструкции для AI. Обязательные поля: value_score, value_explanation, manager_score,
          manager_feedback
        </FieldDescription>
        <div className="relative">
          <Textarea
            id="systemPrompt"
            placeholder={PROMPT_STRUCTURE_EXAMPLE}
            rows={12}
            className="font-mono text-sm min-h-[240px] resize-y"
            aria-invalid={!!form.formState.errors.systemPrompt}
            {...form.register("systemPrompt")}
          />
          <span
            className={cn(
              "absolute bottom-2 right-2 text-[10px] tabular-nums",
              promptLength > PROMPT_WARNING_THRESHOLD
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {promptLength.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()}
          </span>
        </div>
        {form.formState.errors.systemPrompt && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.systemPrompt.message}
          </p>
        )}
      </Field>
    </form>
  );

  const footer = (
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
      <Button type="button" variant="link" onClick={onClose} className="text-foreground">
        Отмена
      </Button>
      <Button onClick={form.handleSubmit(onSubmit)} disabled={isPending}>
        {isPending ? "Сохранение…" : mode === "create" ? "Создать шаблон" : "Сохранить"}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>
              {mode === "create" ? "Создать шаблон" : "Редактировать шаблон"}
            </DrawerTitle>
            <DialogDescription className="sr-only">
              {mode === "create"
                ? "Создание нового шаблона оценки звонков"
                : "Редактирование шаблона"}
            </DialogDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4 flex-1 -mt-2">{formContent}</div>
          <DrawerFooter className="border-t pt-4">{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Создать шаблон" : "Редактировать шаблон"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Создайте кастомный шаблон оценки звонков на основе встроенных или с нуля"
              : "Измените название, описание и системный промпт"}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 -mx-1 px-1">{formContent}</div>
        <DialogFooter className="border-t pt-4 shrink-0">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
