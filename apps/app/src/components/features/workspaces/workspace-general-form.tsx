"use client";

import { generateWorkspaceSlug } from "@calls/shared";
import { Button, Card, CardContent, CardHeader, Input } from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const workspaceGeneralSchema = z.object({
  name: z.string().min(1, "Введите название").max(100, "Не более 100 символов"),
  slug: z
    .string()
    .min(1, "Введите идентификатор")
    .max(50, "Не более 50 символов")
    .regex(
      /^[a-z0-9-]+$/,
      "Только латинские буквы, цифры и дефис (например: my-company)",
    ),
});

export type WorkspaceGeneralFormData = z.infer<typeof workspaceGeneralSchema>;

interface WorkspaceGeneralFormProps {
  name: string;
  slug: string;
  onSave: (data: WorkspaceGeneralFormData) => Promise<void>;
  saving?: boolean;
}

export default function WorkspaceGeneralForm({
  name,
  slug,
  onSave,
  saving = false,
}: WorkspaceGeneralFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<WorkspaceGeneralFormData>({
    resolver: zodResolver(workspaceGeneralSchema),
    mode: "onBlur",
    defaultValues: { name, slug },
  });

  const nameValue = watch("name");

  useEffect(() => {
    if (nameValue && !dirtyFields.slug) {
      setValue("slug", generateWorkspaceSlug(nameValue), {
        shouldValidate: true,
      });
    }
  }, [nameValue, setValue, dirtyFields.slug]);

  const onSubmit = async (data: WorkspaceGeneralFormData) => {
    try {
      await onSave(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Не удалось сохранить настройки";
      const isSlugError =
        typeof msg === "string" &&
        (msg.includes("slug") || msg.includes("идентификатор"));
      setError(isSlugError ? "slug" : "root", { message: msg });
    }
  };

  return (
    <Card className="card mb-6">
      <CardHeader className="p-0 pb-3">
        <div className="section-title flex items-center gap-2">
          <span className="text-base">Общие настройки</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {errors.root && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-[13px] font-medium flex items-center gap-2">
              <span>⚠️</span>
              {errors.root.message}
            </div>
          )}

          <div className="filter-item">
            <label className="filter-label" htmlFor="ws-name">
              Название воркспейса
            </label>
            <Input
              id="ws-name"
              type="text"
              className={`text-input ${errors.name ? "border-red-500 bg-red-50" : ""}`}
              placeholder="Моя компания"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <span className="text-xs text-red-500 mt-1 block">
                {errors.name.message}
              </span>
            )}
          </div>

          <div className="filter-item">
            <label className="filter-label" htmlFor="ws-slug">
              Идентификатор (slug)
            </label>
            <Input
              id="ws-slug"
              type="text"
              className={`text-input ${errors.slug ? "border-red-500 bg-red-50" : ""}`}
              placeholder="my-company"
              aria-invalid={!!errors.slug}
              {...register("slug")}
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Только латинские буквы, цифры и дефис
            </span>
            {errors.slug && (
              <span className="text-xs text-red-500 mt-1 block">
                {errors.slug.message}
              </span>
            )}
          </div>

          <Button
            type="submit"
            variant="success"
            disabled={saving}
            className="self-start"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
