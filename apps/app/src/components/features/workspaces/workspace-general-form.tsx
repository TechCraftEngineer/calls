"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Textarea,
} from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const workspaceGeneralSchema = z.object({
  name: z.string().min(1, "Введите название").max(100, "Не более 100 символов"),
  description: z.string().max(2000, "Не более 2000 символов").default(""),
});

export type WorkspaceGeneralFormData = z.infer<typeof workspaceGeneralSchema>;

interface WorkspaceGeneralFormProps {
  name: string;
  description?: string | null;
  onSave: (data: WorkspaceGeneralFormData) => Promise<void>;
  saving?: boolean;
}

export default function WorkspaceGeneralForm({
  name,
  description,
  onSave,
  saving = false,
}: WorkspaceGeneralFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<WorkspaceGeneralFormData>({
    resolver: zodResolver(workspaceGeneralSchema) as never,
    mode: "onBlur",
    defaultValues: { name, description: description ?? "" },
  });

  const onSubmit = async (data: WorkspaceGeneralFormData) => {
    try {
      await onSave(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Не удалось сохранить настройки";
      setError("root", { message: msg });
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
        <form
          onSubmit={handleSubmit(
            onSubmit as (data: WorkspaceGeneralFormData) => Promise<void>,
          )}
          className="flex flex-col gap-5"
        >
          {errors.root && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-[13px] font-medium flex items-center gap-2">
              <span>⚠️</span>
              {errors.root.message}
            </div>
          )}

          <div className="filter-item">
            <label className="filter-label" htmlFor="ws-name">
              Название рабочего пространства
            </label>
            <Input
              id="ws-name"
              type="text"
              className={`text-input ${errors.name ? "border-red-500 bg-red-50" : ""}`}
              placeholder="Моё рабочее пространство"
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
            <label className="filter-label" htmlFor="ws-description">
              Описание рабочего пространства
            </label>
            <Textarea
              id="ws-description"
              className={`text-input min-h-[100px] resize-y ${errors.description ? "border-red-500 bg-red-50" : ""}`}
              placeholder="Например: продаём промышленное оборудование. Типичные звонки — запросы цен, консультации, жалобы на доставку."
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            <span className="text-[11px] text-gray-400 mt-1 block">
              Используется для более точного анализа и оценки звонков. Можно
              заполнить позже.
            </span>
            {errors.description && (
              <span className="text-xs text-red-500 mt-1 block">
                {errors.description.message}
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
