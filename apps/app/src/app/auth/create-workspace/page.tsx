"use client";

import { paths } from "@calls/config";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { workspacesApi } from "@/lib/api-orpc";
import { getCurrentUser } from "@/lib/auth";

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
  return (
    name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "workspace"
  );
}

function CreateWorkspaceForm() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    mode: "onBlur",
    defaultValues: { name: "", slug: "" },
  });

  const nameValue = watch("name");

  useEffect(() => {
    if (nameValue && !watch("slug")) {
      setValue("slug", generateSlugFromName(nameValue));
    }
  }, [nameValue, setValue, watch]);

  useEffect(() => {
    async function check() {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(paths.auth.signin);
        return;
      }
      try {
        const workspaces = await workspacesApi.list();
        if (workspaces.length > 0) {
          router.replace(paths.root);
          return;
        }
      } catch {
        // API может быть недоступен — показываем форму
      }
      setChecking(false);
    }
    check();
  }, [router]);

  const onSubmit = async (data: CreateWorkspaceFormData) => {
    try {
      const workspace = await workspacesApi.create({
        name: data.name,
        slug: data.slug,
      });

      document.cookie = `active_workspace_id=${workspace.id}; path=/; max-age=31536000; SameSite=Lax`;
      router.push(paths.root);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Не удалось создать workspace";
      const isSlugError =
        typeof msg === "string" &&
        (msg.includes("slug") || msg.includes("идентификатор"));
      setError(isSlugError ? "slug" : "root", { message: msg });
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] font-[Inter]">
        <div className="w-full max-w-[420px] rounded-[16px] border-[#EEE] bg-white p-12 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
          <div className="py-10 text-center text-[#888]">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] font-[Inter]">
      <div className="w-full max-w-[420px] rounded-[16px] border-[#EEE] bg-white p-12 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        <div className="mb-8 text-center">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#FFD600] text-black font-black text-[24px]">
            M
          </div>
          <h1 className="mb-2 text-[24px] font-bold text-[#111]">
            Создайте workspace
          </h1>
          <p className="m-0 text-[14px] text-[#888]">
            Workspace — это пространство для вашей команды. Начните с названия
            компании или проекта.
          </p>
        </div>

        {errors.root && (
          <div className="mb-6 flex items-center gap-[10px] rounded-lg border-[#FFDADA] bg-[#FFF0F0] p-3 text-[13px] font-medium text-[#D32F2F]">
            <span>⚠️</span>
            {errors.root.message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-5">
            <label
              htmlFor="name"
              className="mb-2 block text-[13px] font-semibold text-[#333]"
            >
              Название
            </label>
            <input
              id="name"
              type="text"
              className={`w-full rounded-lg border border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
                errors.name
                  ? "border-red-500 bg-red-50 focus:border-red-500"
                  : ""
              }`}
              placeholder="Моя компания"
              autoComplete="organization"
              {...register("name")}
            />
            {errors.name && (
              <div className="mt-1 text-xs leading-tight text-red-600">
                {errors.name.message}
              </div>
            )}
          </div>

          <div className="mb-5">
            <label
              htmlFor="slug"
              className="mb-2 block text-[13px] font-semibold text-[#333]"
            >
              Идентификатор
            </label>
            <input
              id="slug"
              type="text"
              className={`w-full rounded-lg border border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
                errors.slug
                  ? "border-red-500 bg-red-50 focus:border-red-500"
                  : ""
              }`}
              placeholder="my-company"
              autoComplete="off"
              {...register("slug")}
            />
            <p className="mt-1 text-[11px] text-[#888]">
              Только латинские буквы, цифры и дефис
            </p>
            {errors.slug && (
              <div className="mt-1 text-xs leading-tight text-red-600">
                {errors.slug.message}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="mt-2 w-full cursor-pointer rounded-lg border-none bg-[#111] py-3 text-[15px] font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[#333] hover:-translate-y-px"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Создание..." : "Создать workspace"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href={paths.auth.signout}
            className="text-[13px] text-[#888] hover:text-[#111] transition-colors"
          >
            Выйти из аккаунта
          </Link>
        </div>

        <div className="mt-8 text-center text-[12px] text-[#AAA]">
          &copy; {new Date().getFullYear()} QBS Звонки. Все права защищены.
        </div>
      </div>
    </div>
  );
}

export default function CreateWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] font-[Inter]">
          <div className="w-full max-w-[420px] rounded-[16px] border-[#EEE] bg-white p-12 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
            <div className="py-10 text-center">Загрузка...</div>
          </div>
        </div>
      }
    >
      <CreateWorkspaceForm />
    </Suspense>
  );
}
