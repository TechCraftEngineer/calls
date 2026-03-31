"use client";

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@calls/ui";
import { useQuery } from "@tanstack/react-query";
import { useORPC } from "@/orpc/react";

interface ViewTemplateModalProps {
  open: boolean;
  onClose: () => void;
  slug: string | null;
  onCreateFrom?: (systemPrompt: string, name: string) => void;
}

const PROMPT_STRUCTURE_HELP = `Структура ответа AI (обязательные поля):
• value_score (1–5) — ценность звонка
• value_explanation — пояснение к оценке
• manager_score (1–5) — качество работы менеджера
• manager_feedback — рекомендации менеджеру`;

export function ViewTemplateModal({ open, onClose, slug, onCreateFrom }: ViewTemplateModalProps) {
  const orpc = useORPC();
  const { data: template, isPending } = useQuery({
    ...orpc.settings.getEvaluationTemplateBySlug.queryOptions({
      input: { slug: slug ?? "" },
    }),
    enabled: open && !!slug,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template?.name ?? "Шаблон"}
            {template?.isBuiltin && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">(встроенный)</span>
            )}
          </DialogTitle>
        </DialogHeader>
        {isPending ? (
          <div className="py-8 text-center text-muted-foreground">Загрузка…</div>
        ) : template ? (
          <div className="space-y-4">
            {template.description && (
              <p className="text-sm text-muted-foreground">{template.description}</p>
            )}
            <div>
              <p className="mb-2 text-sm font-medium">Системный промпт</p>
              <pre className="max-h-[400px] overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap font-sans">
                {template.systemPrompt}
              </pre>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <p className="font-medium mb-1">Справка по структуре</p>
              <pre className="whitespace-pre-wrap font-sans text-xs">{PROMPT_STRUCTURE_HELP}</pre>
            </div>
            {template.isBuiltin && onCreateFrom && (
              <Button
                onClick={() => {
                  onCreateFrom(template.systemPrompt, template.name);
                  onClose();
                }}
              >
                Создать на основе этого шаблона
              </Button>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
