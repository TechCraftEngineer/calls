"use client";

import { paths } from "@calls/config";
import { generateWorkspaceSlug } from "@calls/shared";
import { Button, Input, toast } from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { useORPC } from "@/orpc/react";

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

function CreateWorkspaceForm() {
  const router = useRouter();
  const orpc = useORPC();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    mode: "onBlur",
    defaultValues: { name: "", slug: "" },
  });

  const nameValue = watch("name");

  const {
    data: workspacesData,
    isPending: checking,
    error: workspacesError,
  } = useQuery({
    ...orpc.workspaces.list.queryOptions(),
    retry: false,
  });

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user) {
        router.replace(paths.auth.signin);
      }
    });
  }, [router]);

  useEffect(() => {
    if (
      workspacesError &&
      typeof workspacesError === "object" &&
      "code" in workspacesError
    ) {
      if ((workspacesError as { code?: string }).code === "UNAUTHORIZED") {
        router.replace(paths.auth.signin);
      }
    }
  }, [workspacesError, router]);

  useEffect(() => {
    if (!checking && workspacesData?.workspaces?.length) {
      router.replace(paths.root);
    }
  }, [checking, workspacesData, router]);

  const createMutation = useMutation(
    orpc.workspaces.create.mutationOptions({
      onSuccess: async (workspace) => {
        toast.success("Рабочее пространство создано");
        // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API has limited browser support
        document.cookie = `active_workspace_id=${workspace.id}; path=/; max-age=31536000; SameSite=Lax`;
        await queryClient.invalidateQueries({
          queryKey: orpc.workspaces.list.queryKey(),
        });
        router.push(paths.root);
      },
      onError: (err) => {
        const msg =
          err instanceof Error
            ? err.message
            : "Не удалось создать рабочее пространство";
        const isSlugError =
          typeof msg === "string" &&
          (msg.includes("slug") || msg.includes("идентификатор"));
        setError(isSlugError ? "slug" : "root", { message: msg });
        toast.error(msg);
      },
    }),
  );

  useEffect(() => {
    if (nameValue && !dirtyFields.slug) {
      setValue("slug", generateWorkspaceSlug(nameValue), {
        shouldValidate: true,
      });
    }
  }, [nameValue, setValue, dirtyFields.slug]);

  const onSubmit = (data: CreateWorkspaceFormData) => {
    createMutation.mutate({ name: data.name, slug: data.slug });
  };

  if (checking && !workspacesData) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] font-[Inter]">
        <div className="w-full max-w-[420px] rounded-[16px] border-[#EEE] bg-white p-12 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
          <div className="py-10 text-center text-[#888]">Загрузка…</div>
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
            Создайте рабочее пространство
          </h1>
          <p className="m-0 text-[14px] text-[#888]">
            Рабочее пространство — это пространство для вашей команды. Начните с
            названия компании или проекта.
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
            <Input
              id="name"
              type="text"
              className={`w-full rounded-lg border border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
                errors.name
                  ? "border-red-500 bg-red-50 focus:border-red-500"
                  : ""
              }`}
              placeholder="Моя компания"
              autoComplete="organization"
              aria-invalid={!!errors.name}
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
            <Input
              id="slug"
              type="text"
              className={`w-full rounded-lg border border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
                errors.slug
                  ? "border-red-500 bg-red-50 focus:border-red-500"
                  : ""
              }`}
              placeholder="my-company"
              autoComplete="off"
              aria-invalid={!!errors.slug}
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

          <Button
            type="submit"
            variant="dark"
            size="touch"
            className="mt-2 w-full"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending
              ? "Создание…"
              : "Создать рабочее пространство"}
          </Button>
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
            <div className="py-10 text-center">Загрузка…</div>
          </div>
        </div>
      }
    >
      <CreateWorkspaceForm />
    </Suspense>
  );
}
