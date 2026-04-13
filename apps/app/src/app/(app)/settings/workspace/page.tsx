"use client";

import { paths } from "@calls/config";
import type { workspaces } from "@calls/db/schema";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import WorkspaceGeneralForm from "@/components/features/workspaces/workspace-general-form";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { getCurrentUser } from "@/lib/auth";
import { clearActiveWorkspaceCookie } from "@/lib/cookies";
import { useORPC } from "@/orpc/react";

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const orpc = useORPC();
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const workspaceId = activeWorkspace?.id ?? null;
  const isWorkspaceAdmin = activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";
  const isOwner = activeWorkspace?.role === "owner";

  const { data: workspace } = useQuery<typeof workspaces.$inferSelect>(
    workspaceId
      ? orpc.workspaces.get.queryOptions({
          input: { workspaceId },
        })
      : { queryKey: ["workspace-skip"], queryFn: () => null, enabled: false },
  );

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
        toast.success("Настройки компании сохранены");
      },
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "Не удалось сохранить настройки";
        toast.error(msg);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.workspaces.delete.mutationOptions({
      onSuccess: async () => {
        setIsDeleteDialogOpen(false);
        setDeleteConfirmText("");
        toast.success("Компания удалена");

        try {
          // Сначала инвалидируем кэш, затем получаем свежие данные
          await queryClient.invalidateQueries({
            queryKey: orpc.workspaces.list.queryKey(),
          });
          const remainingWorkspaces = await queryClient.fetchQuery(
            orpc.workspaces.list.queryOptions(),
          );

          const hasOtherWorkspaces =
            remainingWorkspaces && remainingWorkspaces.workspaces.length > 0;

          if (hasOtherWorkspaces) {
            // Если есть другие компании - очищаем куку и перезагружаем на корень
            // Провайдер автоматически выберет первую доступную компанию
            clearActiveWorkspaceCookie();
            window.location.href = paths.dashboard.root;
          } else {
            // Если компаний больше нет - на onboarding
            clearActiveWorkspaceCookie();
            window.location.href = paths.onboarding.createWorkspace;
          }
        } catch {
          // При ошибке - fallback redirect
          clearActiveWorkspaceCookie();
          window.location.href = paths.dashboard.root;
        }
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Не удалось удалить компанию");
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

  useEffect(() => {
    if (activeWorkspace && !isWorkspaceAdmin) {
      router.push(paths.forbidden);
    }
  }, [activeWorkspace, isWorkspaceAdmin, router]);

  if (!activeWorkspace) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-muted-foreground">Загрузка…</div>
      </div>
    );
  }

  if (!isWorkspaceAdmin) {
    return null;
  }

  const handleSaveGeneral = async (data: {
    name: string;
    nameEn?: string;
    description?: string | null;
  }) => {
    if (!workspaceId) return;
    await updateMutation.mutateAsync({
      workspaceId,
      name: data.name,
      nameEn: data.nameEn?.trim() || null,
      description: data.description?.trim() || null,
    });
  };

  const handleDeleteWorkspace = () => {
    if (!workspaceId) return;
    if (deleteConfirmText.trim() !== activeWorkspace.name) return;
    deleteMutation.mutate({ workspaceId });
  };

  const isDeleteConfirmed = deleteConfirmText.trim() === activeWorkspace.name;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Настройки компании</h1>
        <p className="mt-1 text-sm text-muted-foreground">{activeWorkspace.name}</p>
      </header>

      {workspace ? (
        <WorkspaceGeneralForm
          name={workspace.name}
          nameEn={workspace.nameEn}
          description={workspace.description}
          onSave={handleSaveGeneral}
          saving={updateMutation.isPending}
        />
      ) : null}

      {isOwner && (
        <>
          <Card className="border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20">
            <CardContent className="p-6">
              <h3 className="text-base font-bold text-red-800 dark:text-red-400 mb-2">
                Опасная зона
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                Удаление компании необратимо. Все данные (звонки, настройки, участники) будут
                удалены.
              </p>
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Удалить компанию
              </Button>
            </CardContent>
          </Card>

          <Dialog
            open={isDeleteDialogOpen}
            onOpenChange={(open) => {
              setIsDeleteDialogOpen(open);
              if (!open) setDeleteConfirmText("");
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Удалить компанию?</DialogTitle>
                <DialogDescription>
                  Вы уверены, что хотите удалить компанию{" "}
                  <span className="font-semibold text-foreground">"{activeWorkspace.name}"</span>?
                  Это действие нельзя отменить. Все данные (звонки, настройки, участники) будут
                  удалены навсегда.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="delete-confirm" className="text-sm font-medium">
                  Введите <span className="font-mono font-semibold">{activeWorkspace.name}</span>{" "}
                  для подтверждения
                </Label>
                <Input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={activeWorkspace.name}
                  disabled={deleteMutation.isPending}
                  autoComplete="off"
                  spellCheck={false}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isDeleteConfirmed) {
                      handleDeleteWorkspace();
                    }
                  }}
                />
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={deleteMutation.isPending}>
                    Отмена
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDeleteWorkspace}
                  disabled={deleteMutation.isPending || !isDeleteConfirmed}
                >
                  {deleteMutation.isPending ? "Удаление…" : "Удалить компанию"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
