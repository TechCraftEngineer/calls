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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@calls/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TemplateFormModal } from "@/components/features/evaluation/template-form-modal";
import { ViewTemplateModal } from "@/components/features/evaluation/view-template-modal";
import type { ManagedUser } from "@/components/features/users/types";
import { useWorkspace } from "@/components/features/workspaces/workspace-provider";
import { getCurrentUser } from "@/lib/auth";
import { useORPC } from "@/orpc/react";

export default function EvaluationSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const orpc = useORPC();
  const { activeWorkspace } = useWorkspace();

  const workspaceId = activeWorkspace?.id ?? null;
  const isWorkspaceAdmin =
    activeWorkspace?.role === "admin" || activeWorkspace?.role === "owner";

  const { data: evaluationSettings } = useQuery({
    ...orpc.settings.getEvaluationSettings.queryOptions(),
    enabled: !!workspaceId && isWorkspaceAdmin,
  });

  const { data: evaluationTemplates = [] } = useQuery({
    ...orpc.settings.getEvaluationTemplates.queryOptions(),
    enabled: !!workspaceId && isWorkspaceAdmin,
  });

  const { data: users = [] } = useQuery({
    ...orpc.users.list.queryOptions(),
    enabled: !!workspaceId && isWorkspaceAdmin,
  });

  const [defaultTemplate, setDefaultTemplate] = useState<string>("general");
  const [templateModal, setTemplateModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    template?: {
      id: string;
      slug: string;
      name: string;
      description: string;
      systemPrompt: string;
    } | null;
    initialPrompt?: string;
    initialName?: string;
  }>({ open: false, mode: "create", template: null });
  const [viewModalSlug, setViewModalSlug] = useState<string | null>(null);

  useEffect(() => {
    if (evaluationSettings?.defaultTemplateSlug) {
      setDefaultTemplate(evaluationSettings.defaultTemplateSlug);
    }
  }, [evaluationSettings?.defaultTemplateSlug]);

  const deleteTemplateMutation = useMutation(
    orpc.settings.deleteEvaluationTemplate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getEvaluationTemplates.queryKey(),
        });
        toast.success("Шаблон удалён");
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Не удалось удалить шаблон",
        );
      },
    }),
  );

  const updateEvaluationMutation = useMutation(
    orpc.settings.updateEvaluationSettings.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.settings.getEvaluationSettings.queryKey(),
        });
        toast.success("Шаблон по умолчанию сохранён");
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

  const handleSaveDefault = () => {
    updateEvaluationMutation.mutate({
      defaultTemplateSlug: defaultTemplate,
    });
  };

  const getTemplateName = (slug: string) => {
    const t = (evaluationTemplates as { slug: string; name: string }[]).find(
      (x) => x.slug === slug,
    );
    return t?.name ?? slug;
  };

  const managedUsers = users as ManagedUser[];
  const templatesList = evaluationTemplates as {
    slug: string;
    name: string;
    description: string;
    isBuiltin: boolean;
    id: string | null;
  }[];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Шаблоны оценки звонков
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Настройка критериев оценки для каждого менеджера и по умолчанию
        </p>
      </header>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-base font-semibold mb-2">Шаблон по умолчанию</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Используется для звонков без привязки к пользователю (по внутреннему
            номеру)
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Select value={defaultTemplate} onValueChange={setDefaultTemplate}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(evaluationTemplates as { slug: string; name: string }[]).map(
                  (t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.name}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleSaveDefault}
              disabled={updateEvaluationMutation.isPending}
            >
              {updateEvaluationMutation.isPending ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold">Шаблоны оценки</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Встроенные шаблоны и созданные вами. Редактируйте промпты для
                кастомных шаблонов.
              </p>
            </div>
            <Button
              onClick={() =>
                setTemplateModal({ open: true, mode: "create", template: null })
              }
            >
              Создать шаблон
            </Button>
          </div>
          <Table className="op-table">
            <TableHeader>
              <TableRow className="border-none">
                <TableHead>Название</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templatesList.map((t) => (
                <TableRow key={t.slug}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {t.description || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.isBuiltin ? "Встроенный" : "Кастомный"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant={t.isBuiltin ? "outline" : "ghost"}
                        size="sm"
                        onClick={() => setViewModalSlug(t.slug)}
                      >
                        Просмотреть
                      </Button>
                      {!t.isBuiltin && t.id && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const full = await queryClient.fetchQuery(
                                orpc.settings.getEvaluationTemplate.queryOptions(
                                  {
                                    input: { id: t.id },
                                  },
                                ),
                              );
                              setTemplateModal({
                                open: true,
                                mode: "edit",
                                template: full,
                              });
                            }}
                          >
                            Редактировать
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (
                                confirm(
                                  `Удалить шаблон «${t.name}»? Пользователи с этим шаблоном перейдут на шаблон по умолчанию.`,
                                )
                              ) {
                                deleteTemplateMutation.mutate({ id: t.id });
                              }
                            }}
                            disabled={deleteTemplateMutation.isPending}
                          >
                            Удалить
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-base font-semibold mb-2">
            Шаблоны по участникам
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Назначьте шаблон каждому менеджеру. Звонки определяются по
            внутренним номерам. Для редактирования перейдите в настройки
            участника.
          </p>
          <Table className="op-table">
            <TableHeader>
              <TableRow className="border-none">
                <TableHead>Участник</TableHead>
                <TableHead>Внутр. номера</TableHead>
                <TableHead>Шаблон</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managedUsers.length > 0 ? (
                managedUsers.map((u) => {
                  const userId = u.userId ?? u.id;
                  const nameParts = [u.givenName, u.familyName].filter(
                    (x): x is string => typeof x === "string" && x.length > 0,
                  );
                  const displayName =
                    nameParts.length > 0
                      ? nameParts.join(" ")
                      : String(u.username ?? "");
                  const usernameStr =
                    typeof u.username === "string" ? u.username : "";
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {displayName || "—"}
                        {usernameStr && displayName && (
                          <span className="block text-xs text-muted-foreground font-normal">
                            {usernameStr}
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className="text-muted-foreground"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {u.internalExtensions || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.evaluation_template_slug
                          ? getTemplateName(u.evaluation_template_slug)
                          : "По умолчанию"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`${paths.users.root}/${userId}/edit`)
                          }
                          aria-label={`Редактировать ${u.username}`}
                        >
                          Настройки
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <p className="text-muted-foreground">
                      Нет участников в рабочем пространстве
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ViewTemplateModal
        open={!!viewModalSlug}
        onClose={() => setViewModalSlug(null)}
        slug={viewModalSlug}
        onCreateFrom={(systemPrompt, name) => {
          setViewModalSlug(null);
          setTemplateModal({
            open: true,
            mode: "create",
            template: null,
            initialPrompt: systemPrompt,
            initialName: name + " (копия)",
          });
        }}
      />

      <TemplateFormModal
        open={templateModal.open}
        onClose={() =>
          setTemplateModal({
            open: false,
            mode: "create",
            template: null,
            initialPrompt: undefined,
            initialName: undefined,
          })
        }
        mode={templateModal.mode}
        template={templateModal.template ?? undefined}
        initialPrompt={templateModal.initialPrompt}
        initialName={templateModal.initialName}
      />
    </div>
  );
}
