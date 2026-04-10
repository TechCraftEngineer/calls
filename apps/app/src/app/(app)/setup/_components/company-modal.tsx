"use client";

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Textarea, toast } from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { useORPC } from "@/orpc/react";
import type { ModalProps } from "@/components/features/setup";

const companySchema = z.object({
  name: z.string().min(1, "Обязательно").max(100),
  nameEn: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
});

export function CompanyModal({ open, onOpenChange, onComplete }: ModalProps) {
  const { activeWorkspace } = useWorkspace();
  const orpc = useORPC();
  const mutation = useMutation(orpc.workspaces.update.mutationOptions());

  const form = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: activeWorkspace?.name || "",
      nameEn: activeWorkspace?.nameEn ?? "",
      description: activeWorkspace?.description ?? "",
    },
  });

  const handleSubmit = async (data: z.infer<typeof companySchema>) => {
    if (!activeWorkspace) return;
    try {
      await mutation.mutateAsync({
        workspaceId: activeWorkspace.id,
        name: data.name,
        nameEn: data.nameEn || null,
        description: data.description || null,
      });
      onComplete();
    } catch (_err) {
      toast.error("Ошибка сохранения");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Данные компании</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Название (русский) *</label>
            <Input {...form.register("name")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Название (английский)</label>
            <Input {...form.register("nameEn")} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Описание</label>
            <Textarea {...form.register("description")} rows={3} />
          </div>
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
