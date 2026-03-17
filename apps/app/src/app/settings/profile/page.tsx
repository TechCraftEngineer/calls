"use client";

import { paths } from "@calls/config";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  PasswordInput,
  toast,
} from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useSession } from "@/lib/better-auth";
import { DeleteAccountDialog } from "@/components/features/settings/delete-account-dialog";
import SettingsPageShell from "@/components/features/settings/settings-page-shell";
import type { User } from "@/lib/auth";
import {
  authClient,
  getCurrentUser,
  logout,
  toRussianAuthMessage,
} from "@/lib/better-auth";
import {
  type ChangePasswordFormData,
  changePasswordSchema,
  type UpdateProfileFormData,
  updateProfileSchema,
} from "@/lib/validations";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const user = session?.user;
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (user) {
        try {
          const accounts = await authClient.listAccounts();
          const hasCredential = (accounts.data ?? []).some(
            (a: { providerId: string }) => a.providerId === "credential",
          );
          setHasPassword(hasCredential);
        } catch {
          setHasPassword(true);
        }
      }
      setAccountsLoading(false);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!accountsLoading && !user) {
      router.push(paths.auth.signin);
    }
  }, [accountsLoading, user, router]);

  const updateUser = useCallback((updates: Partial<User>) => {
    // Better Auth автоматически обновит сессию через useSession
    // Дополнительно можно вызвать refetch если нужно
  }, []);

  const profileForm = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user?.name ?? "" },
    values: user ? { name: user.name } : undefined,
  });

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = async (data: UpdateProfileFormData) => {
    const result = await authClient.updateUser({ name: data.name });
    if (result.error) {
      toast.error(
        toRussianAuthMessage(result.error.message ?? "Ошибка сохранения"),
      );
      return;
    }
    toast.success("Имя обновлено");
    updateUser({ name: data.name });
  };

  const onPasswordSubmit = async (data: ChangePasswordFormData) => {
    const result = await authClient.changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    if (result.error) {
      toast.error(
        toRussianAuthMessage(result.error.message ?? "Ошибка смены пароля"),
      );
      return;
    }
    toast.success("Пароль изменён");
    passwordForm.reset({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const result = await authClient.deleteUser({
        callbackURL: paths.auth.signin,
      });
      if (result.error) {
        toast.error(
          toRussianAuthMessage(
            result.error.message ?? "Не удалось удалить аккаунт",
          ),
        );
        setDeleting(false);
        return;
      }
      await logout();
      router.replace(paths.auth.signin);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Не удалось удалить аккаунт",
      );
      setDeleting(false);
    }
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    if (!deleting) {
      setDeleteConfirmPhrase("");
    }
  };

  if (accountsLoading || sessionPending || !user) {
    return (
      <SettingsPageShell>
        <div className="flex justify-center py-24">
          <div className="text-muted-foreground">Загрузка…</div>
        </div>
      </SettingsPageShell>
    );
  }

  return (
    <SettingsPageShell>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Настройки аккаунта
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Имя, пароль и основные данные профиля
        </p>
      </header>

      <div className="space-y-8">
        {/* Профиль — имя */}
        <Card>
          <CardHeader>
            <CardTitle>Профиль</CardTitle>
            <CardDescription>Отображаемое имя в системе</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={profileForm.handleSubmit(onProfileSubmit)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
                  Имя
                </label>
                <Input
                  id="name"
                  {...profileForm.register("name")}
                  placeholder="Ваше имя"
                  className="max-w-sm"
                  aria-invalid={!!profileForm.formState.errors.name}
                />
                {profileForm.formState.errors.name && (
                  <p className="mt-1 text-sm text-destructive">
                    {profileForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Email: {user.email}
              </div>
              <Button
                type="submit"
                disabled={profileForm.formState.isSubmitting}
              >
                {profileForm.formState.isSubmitting
                  ? "Сохранение…"
                  : "Сохранить имя"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Смена пароля */}
        <Card>
          <CardHeader>
            <CardTitle>Пароль</CardTitle>
            <CardDescription>
              {hasPassword
                ? "Измените пароль для входа в систему"
                : "У вас нет пароля (вход через Google). Установите пароль для входа по email."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasPassword ? (
              <form
                onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="mb-2 block text-sm font-medium"
                  >
                    Текущий пароль
                  </label>
                  <PasswordInput
                    id="currentPassword"
                    {...passwordForm.register("currentPassword")}
                    placeholder="••••••••"
                    className="max-w-sm"
                    aria-invalid={
                      !!passwordForm.formState.errors.currentPassword
                    }
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="mt-1 text-sm text-destructive">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="newPassword"
                    className="mb-2 block text-sm font-medium"
                  >
                    Новый пароль
                  </label>
                  <PasswordInput
                    id="newPassword"
                    {...passwordForm.register("newPassword")}
                    placeholder="••••••••"
                    className="max-w-sm"
                    aria-invalid={!!passwordForm.formState.errors.newPassword}
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="mt-1 text-sm text-destructive">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Минимум 8 символов, заглавная, строчная буква и цифра
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-medium"
                  >
                    Подтвердите новый пароль
                  </label>
                  <PasswordInput
                    id="confirmPassword"
                    {...passwordForm.register("confirmPassword")}
                    placeholder="••••••••"
                    className="max-w-sm"
                    aria-invalid={
                      !!passwordForm.formState.errors.confirmPassword
                    }
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-destructive">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={passwordForm.formState.isSubmitting}
                >
                  {passwordForm.formState.isSubmitting
                    ? "Сохранение…"
                    : "Изменить пароль"}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Чтобы установить пароль, воспользуйтесь{" "}
                <a
                  href={paths.auth.forgotPassword}
                  className="text-primary underline hover:no-underline"
                >
                  восстановлением пароля
                </a>
                . Вам придёт письмо со ссылкой для установки нового пароля.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Удаление аккаунта */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">
              Удаление аккаунта
            </CardTitle>
            <CardDescription>
              Безвозвратно удалить аккаунт и все связанные данные. Это действие
              нельзя отменить.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden />
              Удалить аккаунт
            </Button>
          </CardContent>
        </Card>
      </div>

      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={(o) => !o && closeDeleteDialog()}
        confirmPhrase={deleteConfirmPhrase}
        onConfirmPhraseChange={setDeleteConfirmPhrase}
        deleting={deleting}
        onConfirm={handleDeleteAccount}
        onCancel={closeDeleteDialog}
      />
    </SettingsPageShell>
  );
}
