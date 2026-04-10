"use client";

import { Button, Card, CardContent, Dialog, DialogContent, DialogHeader, DialogTitle } from "@calls/ui";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useORPC } from "@/orpc/react";
import type { ModalProps } from "./types";

export function PromptsModal({ open, onOpenChange, onComplete }: ModalProps) {
  const orpc = useORPC();
  const { data: prompts, isLoading } = useQuery({
    ...orpc.settings.getPrompts.queryOptions(),
    enabled: open,
  });

  const valuePrompt = prompts?.find((p) => p.slug === "value-extraction");
  const scriptPrompt = prompts?.find((p) => p.slug === "script-evaluation");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Системные промпты</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <h4 className="mb-2 font-medium">Ценность</h4>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Используется для извлечения ценности из разговора
                  </p>
                  {valuePrompt && (
                    <pre className="max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                      {valuePrompt.prompt}
                    </pre>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <h4 className="mb-2 font-medium">Оценка скрипта</h4>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Используется для оценки качества работы менеджера
                  </p>
                  {scriptPrompt && (
                    <pre className="max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                      {scriptPrompt.prompt}
                    </pre>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
        <Button onClick={onComplete} className="w-full">
          Продолжить
        </Button>
      </DialogContent>
    </Dialog>
  );
}
