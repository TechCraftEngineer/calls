"use client";

import { Button, Input, toast } from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useORPC } from "@/orpc/react";

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Введите название")
    .max(100, "Не более 100 символов"),
});

type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onSuccess: (workspaceId: string) => void;
}

export default function CreateWorkspaceModal({
  onClose,
  onSuccess,
}: CreateWorkspaceModalProps) {
  const orpc = useORPC();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    mode: "onBlur",
    defaultValues: { name: "" },
  });

  const createMutation = useMutation(
    orpc.workspaces.create.mutationOptions({
      onSuccess: (workspace) => {
        toast.success("Рабочее пространство создано");
        onSuccess(workspace.id);
      },
      onError: (err) => {
        const msg =
          err instanceof Error
            ? err.message
            : "Не удалось создать рабочее пространство";
        setError("root", { message: msg });
        toast.error(msg);
      },
    }),
  );

  const onSubmit = (data: CreateWorkspaceFormData) => {
    createMutation.mutate({ name: data.name.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FFD600] rounded-lg flex items-center justify-center font-black text-lg">
              M
            </div>
            <h2 className="text-xl font-bold text-gray-900 m-0">
              Создать рабочее пространство
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
          >
            &times;
          </Button>
        </div>

        <p className="text-sm text-gray-500 m-0 leading-relaxed">
          Рабочее пространство объединяет команду и данные. Укажите название
          рабочего пространства или проекта.
        </p>

        {errors.root && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-[13px] font-medium flex items-center gap-2">
            <span>⚠️</span>
            {errors.root.message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="name"
              className="text-[13px] font-semibold text-gray-700"
            >
              Название
            </label>
            <Input
              id="name"
              type="text"
              className={`w-full h-11 px-4 rounded-lg border border-gray-200 text-sm focus:border-[#FFD600] focus:ring-4 focus:ring-[#FFD600]/10 focus:outline-none transition-all ${
                errors.name ? "border-red-500 bg-red-50" : ""
              }`}
              placeholder="Моё рабочее пространство"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <span className="text-xs text-red-500">
                {errors.name.message}
              </span>
            )}
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              type="button"
              variant="link"
              onClick={onClose}
              className="text-foreground"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="dark"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? "Создание…"
                : "Создать рабочее пространство"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
