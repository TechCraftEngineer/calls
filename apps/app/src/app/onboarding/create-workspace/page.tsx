"use client";

import { paths } from "@calls/config";
import { Button, Input, toast } from "@calls/ui";
import { workspaceNameSchema } from "@calls/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { useORPC } from "@/orpc/react";

const createWorkspaceSchema = z.object({
  name: workspaceNameSchema,
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
    formState: { errors },
  } = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    mode: "onBlur",
    defaultValues: { name: "" },
  });

  const {
    data: workspacesData,
    isPending: checkingWorkspaces,
    error: workspacesError,
  } = useQuery({
    ...orpc.workspaces.list.queryOptions(),
    retry: false,
  });

  const { data: pendingInvitationsData, isPending: checkingInvitations } =
    useQuery({
      ...orpc.workspaces.getPendingInvitationsForCurrentUser.queryOptions(),
      retry: false,
    });

  const validateTokenMutation = useMutation(
    orpc.workspaces.validateInvitationToken.mutationOptions(),
  );
  const validateTokenMutationRef = useRef(validateTokenMutation);

  useEffect(() => {
    validateTokenMutationRef.current = validateTokenMutation;
  }, [validateTokenMutation]);

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

  const checking = checkingWorkspaces || checkingInvitations;

  useEffect(() => {
    if (checking) return;

    const invitations = pendingInvitationsData?.invitations ?? [];

    // Приоритет приглашениям, если они есть
    if (invitations.length > 0) {
      const firstInvitation = invitations[0];

      // Валидируем токен перед редиректом
      validateTokenMutationRef.current.mutate(
        { token: firstInvitation.token },
        {
          onSuccess: (result) => {
            if (result.valid) {
              router.replace(paths.invite.byToken(firstInvitation.token));
            } else {
              console.warn("Invalid invitation token:", result.reason);
              // Если токен невалиден, проверяем воркспейсы
              if (workspacesData?.workspaces?.length) {
                router.replace(paths.root);
              }
            }
          },
          onError: (error) => {
            console.error("Error validating invitation token:", error);
            // При ошибке валидации, проверяем воркспейсы
            if (workspacesData?.workspaces?.length) {
              router.replace(paths.root);
            }
          },
        },
      );
      return;
    }

    // Иначе проверяем воркспейсы
    if (workspacesData?.workspaces?.length) {
      router.replace(paths.root);
    }
  }, [checking, workspacesData, pendingInvitationsData, router]);

  const createMutation = useMutation(
    orpc.workspaces.create.mutationOptions({
      onSuccess: async (workspace) => {
        toast.success("Компания создана");
        // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API has limited browser support
        document.cookie = `active_workspace_id=${workspace.id}; path=/; max-age=31536000; SameSite=Lax`;
        await queryClient.invalidateQueries({
          queryKey: orpc.workspaces.list.queryKey(),
        });
        router.push(paths.root);
      },
      onError: (err) => {
        const msg =
          err instanceof Error ? err.message : "Не удалось создать компанию";
        setError("root", { message: msg });
        toast.error(msg);
      },
    }),
  );

  const onSubmit = (data: CreateWorkspaceFormData) => {
    createMutation.mutate({ name: data.name });
  };

  if (checking) {
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
            Создайте компанию
          </h1>
          <p className="m-0 text-[14px] text-[#888]">
            Компания объединяет команду и данные. Начните с названия.
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
              placeholder="Например: Маркетинг…"
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

          <Button
            type="submit"
            variant="dark"
            size="touch"
            className="mt-2 w-full"
            disabled={createMutation.isPending}
            aria-busy={createMutation.isPending}
            aria-disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Создать компанию
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
