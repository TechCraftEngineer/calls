"use client";

import { paths } from "@calls/config";
import {
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import WorkspaceGeneralForm from "@/components/features/workspaces/workspace-general-form";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { getCurrentUser } from "@/lib/auth";
import { useORPC } from "@/orpc/react";

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const orpc = useORPC();
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();

  const workspaceId = activeWorkspace?.id ?? null;
  const isWorkspaceAdmin =
    activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";
  const isOwner = activeWorkspace?.role === "owner";

  const { data: workspace } = useQuery({
    ...orpc.workspaces.get.queryOptions({
      input: { workspaceId: workspaceId ?? "" },
    }),
    enabled: !!workspaceId,
  });

  const { data: evaluationSettings } = useQuery({
    ...orpc.settings.getEvaluationSettings.queryOptions(),
    enabled: !!workspaceId && isWorkspaceAdmin,
  });

  const { data: evaluationTemplates = [] } = useQuery({
    ...orpc.settings.getEvaluationTemplates.queryOptions(),
    enabled: !!workspaceId && isWorkspaceAdmin,
  });

  const [defaultTemplate, setDefaultTemplate] = useState<string>("general");

  const invalidateWorkspaceQueries = () => {
    if (!workspaceId) return;
    queryClient.invalidateQueries({
      queryKey: orpc.workspaces.get.queryKey({
        input: { workspaceId },
      }),
    });
  };

  const updateMutation = useMutation(
    orpc.workspaces.update.mutationOptions({
      onSuccess: () => {
        refreshWorkspaces();
        invalidateWorkspaceQueries();
        toast.success("Настройки рабочего пространства сохранены");
      },
      onError: (err) => {
        const msg =
          err instanceof Error ? err.message : "Не удалось сохранить настройки";
        toast.error(msg);
      },
    }),
  );

  useEffect(() => {
    if (evaluationSettings?.defaultTemplateSlug) {
      setDefaultTemplate(evaluationSettings.defaultTemplateSlug);
    }
  }, [evaluationSettings?.defaultTemplateSlug]);

  const updateEvaluationMutation = useMutation(
    orpc.settings.updateEvaluationSettings.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getEvaluationSettings.queryKey(),
        });
        toast.success("Шаблон оценки по умолчанию сохранён");
      },
      onError: (err) => {
        toast.error(
          err instanceof Error
            ? err.message
            : "Не удалось сохранить настройки оценки",
        );
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.workspaces.delete.mutationOptions({
      onSuccess: async () => {
        await refreshWorkspaces();
        toast.success("Рабочее пространство удалено");
        router.replace(paths.onboarding.createWorkspace);
      },
      onError: (err) => {
        toast.error(
          err instanceof Error
            ? err.message
            : "Не удалось удалить рабочее пространство",
        );
      },
    }),
  );

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user) {
        router.push(paths.auth.signin);
      }
    });
  }, [router]);

  if (!activeWorkspace) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-muted-foreground">Загрузка…</div>
      </div>
    );
  }

  if (!isWorkspaceAdmin) {
    router.push(paths.forbidden);
    return null;
  }

  const handleSaveGeneral = async (data: { name: string; slug: string }) => {
    if (!workspaceId) return;
    await updateMutation.mutateAsync({
      workspaceId,
      name: data.name,
      slug: data.slug,
    });
  };

  const handleDeleteWorkspace = () => {
    if (!workspaceId) return;
    if (
      !confirm(
        `Вы уверены, что хотите удалить рабочее пространство "${activeWorkspace.name}"? Это действие нельзя отменить.`,
      )
    )
      return;
    deleteMutation.mutate({ workspaceId });
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Настройки рабочего пространства
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeWorkspace.name}
        </p>
      </header>

      {workspace ? (
        <WorkspaceGeneralForm
          name={(workspace as { name: string }).name}
          slug={(workspace as { slug: string }).slug}
          onSave={handleSaveGeneral}
          saving={updateMutation.isPending}
        />
      ) : null}

      {isWorkspaceAdmin && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-semibold mb-2">Оценка звонков</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Шаблон по умолчанию для звонков без привязки к пользователю
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Select
                value={defaultTemplate}
                onValueChange={setDefaultTemplate}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    evaluationTemplates as { slug: string; name: string }[]
                  ).map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() =>
                  updateEvaluationMutation.mutate({
                    defaultTemplateSlug: defaultTemplate as
                      | "sales"
                      | "support"
                      | "general",
                  })
                }
                disabled={updateEvaluationMutation.isPending}
              >
                {updateEvaluationMutation.isPending
                  ? "Сохранение…"
                  : "Сохранить"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isOwner && (
        <Card className="border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20">
          <CardContent className="p-6">
            <h3 className="text-base font-bold text-red-800 dark:text-red-400 mb-2">
              Опасная зона
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              Удаление рабочего пространства необратимо. Все данные (звонки,
              настройки, участники) будут удалены.
            </p>
            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
              onClick={handleDeleteWorkspace}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? "Удаление…"
                : "Удалить рабочее пространство"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
