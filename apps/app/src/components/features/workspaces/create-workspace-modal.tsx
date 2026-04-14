"use client";

import { paths } from "@calls/config";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  toast,
} from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useORPC } from "@/orpc/react";

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(100, "Не более 100 символов"),
});

type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;

interface CreateWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (workspaceId: string) => void | Promise<void>;
}

export default function CreateWorkspaceModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateWorkspaceModalProps) {
  const orpc = useORPC();
  const router = useRouter();

  const form = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: "" },
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation(
    orpc.workspaces.create.mutationOptions({
      onSuccess: async (workspace) => {
        toast.success("Компания создана");
        form.reset();

        // Refetch to ensure fresh data
        await queryClient.refetchQueries({
          queryKey: orpc.workspaces.list.queryKey(),
        });

        await onSuccess(workspace.id);
        onOpenChange(false);

        // Редирект на страницу настройки
        router.push(paths.setup.root);
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Не удалось создать компанию";
        form.setError("root", { message: msg });
        toast.error(msg);
      },
    }),
  );

  const onSubmit = (data: CreateWorkspaceFormData) => {
    createMutation.mutate({ name: data.name });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 bg-[#FFD600] rounded-lg flex items-center justify-center font-black text-lg"
              aria-hidden="true"
            >
              M
            </div>
            <DialogTitle>Создать компанию</DialogTitle>
          </div>
          <DialogDescription>
            Компания объединяет команду и данные. Укажите название компании или проекта.
          </DialogDescription>
        </DialogHeader>

        {form.formState.errors.root && (
          <div
            role="alert"
            aria-live="polite"
            className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-[13px] font-medium flex items-center gap-2"
          >
            <span aria-hidden="true">⚠️</span>
            {form.formState.errors.root.message}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ромашка…"
                      autoComplete="organization"
                      spellCheck={false}
                      className="min-h-[44px] text-base md:text-sm"
                      style={{ touchAction: "manipulation" }}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="link"
                onClick={() => onOpenChange(false)}
                className="text-foreground min-h-[44px]"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                variant="dark"
                disabled={createMutation.isPending}
                aria-busy={createMutation.isPending}
                className="min-h-[44px] gap-2"
              >
                {createMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                )}
                Создать компанию
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
