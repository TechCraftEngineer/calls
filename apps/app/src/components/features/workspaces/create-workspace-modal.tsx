"use client";

import { Input } from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { workspacesApi } from "@/lib/api-orpc";

const createWorkspaceSchema = z.object({
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

type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;

function generateSlugFromName(name: string): string {
  const ru = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "j",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ы: "y",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  const transliterated = name
    .toLowerCase()
    .split("")
    .map((char) => {
      return ru[char as keyof typeof ru] || char;
    })
    .join("");

  return (
    transliterated
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "workspace"
  );
}

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onSuccess: (workspaceId: string) => void;
}

export default function CreateWorkspaceModal({
  onClose,
  onSuccess,
}: CreateWorkspaceModalProps) {
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    mode: "onBlur",
    defaultValues: { name: "", slug: "" },
  });

  const nameValue = watch("name");

  useEffect(() => {
    // Обновляем slug только если пользователь еще не редактировал его вручную
    if (nameValue && !dirtyFields.slug) {
      setValue("slug", generateSlugFromName(nameValue), {
        shouldValidate: true,
      });
    }
  }, [nameValue, setValue, dirtyFields.slug]);

  const onSubmit = async (data: CreateWorkspaceFormData) => {
    try {
      const workspace = await workspacesApi.create({
        name: data.name,
        slug: data.slug,
      });

      onSuccess(workspace.id);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Не удалось создать workspace";
      const isSlugError =
        typeof msg === "string" &&
        (msg.includes("slug") || msg.includes("идентификатор"));
      setError(isSlugError ? "slug" : "root", { message: msg });
    }
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
              Создать воркспейс
            </h2>
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors border-none cursor-pointer"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <p className="text-sm text-gray-500 m-0 leading-relaxed">
          Workspace — это пространство для вашей команды. Начните с названия
          компании или проекта.
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
              placeholder="Моя компания"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <span className="text-xs text-red-500">
                {errors.name.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="slug"
              className="text-[13px] font-semibold text-gray-700"
            >
              Идентификатор
            </label>
            <Input
              id="slug"
              type="text"
              className={`w-full h-11 px-4 rounded-lg border border-gray-200 text-sm focus:border-[#FFD600] focus:ring-4 focus:ring-[#FFD600]/10 focus:outline-none transition-all ${
                errors.slug ? "border-red-500 bg-red-50" : ""
              }`}
              placeholder="my-company"
              aria-invalid={!!errors.slug}
              {...register("slug")}
            />
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-gray-400">
                Только латинские буквы, цифры и дефис
              </span>
              {errors.slug && (
                <span className="text-xs text-red-500">
                  {errors.slug.message}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-[2] h-11 rounded-lg border-none bg-[#111] text-sm font-semibold text-white hover:bg-gray-800 transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Создание..." : "Создать воркспейс"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
