"use client";

import { paths } from "@calls/config";
import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PasswordInput,
} from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { skipToken, useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { getCurrentUser } from "@/lib/auth";
import {
  type InviteAcceptData,
  inviteAcceptLinkSchema,
  inviteAcceptSchema,
} from "@/lib/validations";
import { useORPC } from "@/orpc/react";

interface Invitation {
  invitationType: "link" | "email";
  email: string | null;
  workspaceName: string;
  userExists: boolean;
  requiresPassword: boolean;
  role: "owner" | "admin" | "member";
  workspaceId: string;
}

type InviteMode =
  | "loading" // Загрузка приглашения
  | "checking-auth" // Проверка авторизации
  | "checking-password" // Проверка наличия пароля
  | "login-existing" // Неавторизован, существующий пользователь
  | "register-new" // Неавторизован, новый пользователь
  | "join-button" // Авторизован, есть пароль — просто кнопка
  | "create-password-then-join" // Авторизован, нет пароля (OAuth)
  | "wrong-email"; // Авторизован, email не совпадает

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const orpc = useORPC();
  const token = typeof params.token === "string" ? params.token : "";

  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<{
    id: string | number;
    email: string;
  } | null>(null);
  const [userHasPassword, setUserHasPassword] = useState<boolean | null>(null);
  const [isLinkInvitation, setIsLinkInvitation] = useState<boolean | null>(null);
  const [inviteMode, setInviteMode] = useState<InviteMode>("loading");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Валидатор для проверки доступности приглашения
  const isInvitationEnabled = (
    currentUser: { id: string | number; email: string } | null,
    invitation: Invitation | null,
  ): boolean => {
    if (!currentUser || !invitation) return false;
    if (!currentUser.email) return false;

    // Для link-приглашений любой авторизованный пользователь может принять
    if (invitation.invitationType === "link") return true;

    // Для email-приглашений проверяем совпадение email
    return invitation.email
      ? currentUser.email.toLowerCase() === invitation.email.toLowerCase()
      : false;
  };

  // Create dynamic schema based on invitation type
  const createInviteSchema = useCallback((isLink: boolean) => {
    return isLink ? inviteAcceptLinkSchema : inviteAcceptSchema;
  }, []);

  const resolver = useMemo(
    () => zodResolver(createInviteSchema(isLinkInvitation === true)),
    [isLinkInvitation, createInviteSchema],
  );

  const form = useForm<InviteAcceptData>({
    resolver,
    defaultValues: {
      name: "",
      password: "",
      email: "",
    },
    mode: "onBlur",
  });

  const {
    data: invitation,
    isLoading,
    error: fetchError,
  } = useQuery({
    ...orpc.workspaces.getInvitationByToken.queryOptions({
      input: token ? { token } : skipToken,
    }),
  });

  useEffect(() => {
    setIsLinkInvitation(invitation?.invitationType === "link");
  }, [invitation]);

  // Update form when invitation type changes - combined effect
  useEffect(() => {
    // Ждем пока тип приглашения будет известен
    if (isLinkInvitation === null) return;
    if (!invitation) return;

    if (isLinkInvitation) {
      // Для link-приглашений НЕ очищаем email (пользователь должен его ввести)
      // Сбрасываем только name и password
      form.reset({
        name: "",
        password: "",
        email: form.getValues("email") || "",
      });
    } else {
      // Для email-приглашений очищаем email (он будет из invitation.email)
      form.reset({
        name: "",
        password: "",
        email: "",
      });
    }
  }, [isLinkInvitation, invitation, form]);

  // Проверяем наличие пароля у пользователя, если он авторизован и email совпадает (или это link-приглашение)
  const { data: passwordCheck } = useQuery<{
    hasPassword: boolean;
    exists: boolean;
    userId?: string;
  }>({
    ...orpc.workspaces.checkUserPassword.queryOptions({
      input: { email: currentUser?.email || "" },
    }),
    enabled: isInvitationEnabled(currentUser, invitation || null),
  });

  // Вычисляем режим отображения на основе всех факторов
  useEffect(() => {
    if (isLoading || !invitation) {
      setInviteMode("loading");
      return;
    }

    if (checkingAuth) {
      setInviteMode("checking-auth");
      return;
    }

    // Неавторизован
    if (!currentUser) {
      if (invitation.userExists) {
        setInviteMode("login-existing");
      } else {
        setInviteMode("register-new");
      }
      return;
    }

    // Авторизован — проверяем email
    const isCorrectEmail =
      invitation.invitationType === "link" ||
      (invitation.email && currentUser.email.toLowerCase() === invitation.email.toLowerCase());

    if (!isCorrectEmail) {
      setInviteMode("wrong-email");
      return;
    }

    // Email совпадает — проверяем наличие пароля
    if (userHasPassword === null) {
      setInviteMode("checking-password");
      return;
    }

    if (userHasPassword) {
      setInviteMode("join-button");
    } else {
      setInviteMode("create-password-then-join");
    }
  }, [invitation, isLoading, currentUser, checkingAuth, userHasPassword]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (passwordCheck && typeof passwordCheck === "object" && "hasPassword" in passwordCheck) {
      setUserHasPassword(passwordCheck.hasPassword);
    }
  }, [passwordCheck]);

  useEffect(() => {
    if (invitation && !isLoading && !checkingAuth && !currentUser) {
      form.setFocus("name");
    }
  }, [invitation, isLoading, checkingAuth, currentUser, form]);

  const acceptExistingMutation = useMutation(
    orpc.workspaces.acceptInvitationForExistingUser.mutationOptions({
      onSuccess: (data) => {
        router.push(`/?workspace=${data.workspaceId}&message=joined`);
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Не удалось принять приглашение");
      },
    }),
  );

  const acceptInvitationMutation = useMutation(
    orpc.workspaces.acceptInvitation.mutationOptions({
      onSuccess: () => {
        const emailForRedirect = isLinkInvitation ? form.getValues("email") : invitation?.email;
        router.push(
          `${paths.auth.signin}?message=invite_accepted&email=${encodeURIComponent(emailForRedirect ?? "")}`,
        );
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Не удалось принять приглашение");
      },
    }),
  );

  const submitting = acceptExistingMutation.isPending || acceptInvitationMutation.isPending;

  const handleAcceptForExistingUser = async () => {
    if (!currentUser || !invitation) return;

    // For link-based invitations, any user can accept
    if (
      !isLinkInvitation &&
      invitation.email &&
      currentUser.email.toLowerCase() !== invitation.email.toLowerCase()
    ) {
      setError(
        `Это приглашение предназначено для ${invitation.email}. Вы вошли как ${currentUser.email}. Пожалуйста, выйдите и войдите с правильным аккаунтом.`,
      );
      return;
    }

    setError("");
    acceptExistingMutation.mutate({ token });
  };

  const onSubmit = (data: InviteAcceptData) => {
    setError("");
    acceptInvitationMutation.mutate({
      token,
      password: data.password,
      name: data.name?.trim() || undefined,
      email: isLinkInvitation ? data.email?.trim() : undefined,
    });
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FB] p-4">
        <div className="text-center max-w-md">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="text-red-600"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Неверная ссылка</h1>
          <p className="text-gray-600 mb-6">Ссылка приглашения некорректна или отсутствует</p>
          <Link
            href={paths.auth.signin}
            className="inline-flex rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white no-underline hover:bg-gray-800 transition-colors min-h-[44px] items-center justify-center"
          >
            Перейти ко входу
          </Link>
        </div>
      </div>
    );
  }

  if (
    inviteMode === "loading" ||
    inviteMode === "checking-auth" ||
    inviteMode === "checking-password"
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FB]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
          <p className="text-gray-600">
            {inviteMode === "checking-password" ? "Проверка данных..." : "Загрузка…"}
          </p>
        </div>
      </div>
    );
  }

  if (fetchError || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FB] p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="text-amber-600"
              strokeWidth="2"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Приглашение не найдено</h1>
          <p className="mb-6 text-sm text-gray-600">
            Ссылка приглашения истекла или недействительна. Попросите администратора отправить новое
            приглашение.
          </p>
          <Link
            href={paths.auth.signin}
            className="inline-flex rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white no-underline hover:bg-gray-800 transition-colors min-h-[44px] items-center justify-center"
          >
            Перейти ко входу
          </Link>
        </div>
      </div>
    );
  }

  // Режим: Авторизован, email совпадает, есть пароль — просто кнопка
  if (inviteMode === "join-button") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] p-4">
        <div className="w-full max-w-[480px] rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          <div className="mb-8 text-center">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-blue-600 text-white font-bold text-2xl shadow-lg">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Присоединиться к компании</h1>
            <p className="text-sm text-gray-600 mb-1">
              Приглашение в «<strong>{invitation.workspaceName}</strong>»
            </p>
            {!isLinkInvitation && invitation.email && (
              <p className="text-sm text-gray-500">{invitation.email}</p>
            )}
          </div>

          {error && (
            <div
              className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              role="alert"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="shrink-0 mt-0.5"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-6">
            <Button
              onClick={handleAcceptForExistingUser}
              variant="dark"
              className="w-full min-h-[48px] text-base font-semibold"
              disabled={submitting}
            >
              {submitting ? "Присоединение…" : "Присоединиться к компании"}
            </Button>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-600">
              Нужна помощь?{" "}
              <Link
                href={paths.auth.signin}
                className="font-semibold text-gray-900 underline hover:text-gray-700 transition-colors"
              >
                Связаться с поддержкой
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Режим: Авторизован, нет пароля (OAuth) — создать пароль, затем присоединиться
  if (inviteMode === "create-password-then-join") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] p-4">
        <div className="w-full max-w-[480px] rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          <div className="mb-8 text-center">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-blue-600 text-white font-bold text-2xl shadow-lg">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Установите пароль</h1>
            <p className="text-sm text-gray-600 mb-1">
              Приглашение в «<strong>{invitation.workspaceName}</strong>»
            </p>
            {!isLinkInvitation && invitation.email && (
              <p className="text-sm text-gray-500">{invitation.email}</p>
            )}
          </div>

          {error && (
            <div
              className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              role="alert"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="shrink-0 mt-0.5"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-blue-900 m-0">
                У вашего аккаунта нет пароля. Установите его для защиты доступа, затем вы сможете
                присоединиться к компании.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Ваше имя</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Как к вам обращаться"
                          className="w-full text-base"
                          autoComplete="name"
                          disabled={submitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">
                        Пароль <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="Минимум 8 символов"
                          className="w-full text-base"
                          autoComplete="new-password"
                          disabled={submitting}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-500">
                        Используйте не менее 8 символов
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  variant="dark"
                  className="mt-4 w-full min-h-[48px] text-base font-semibold"
                  disabled={submitting}
                >
                  {submitting ? "Установка пароля…" : "Установить пароль и присоединиться"}
                </Button>
              </form>
            </Form>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-600">
              Нужна помощь?{" "}
              <Link
                href={paths.auth.signin}
                className="font-semibold text-gray-900 underline hover:text-gray-700 transition-colors"
              >
                Связаться с поддержкой
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Режим: Авторизован, email не совпадает
  if (inviteMode === "wrong-email") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] p-4">
        <div className="w-full max-w-[480px] rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          <div className="mb-8 text-center">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500 text-white font-bold text-2xl shadow-lg">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Несоответствие email</h1>
            <p className="text-sm text-gray-600 mb-1">
              Приглашение в «<strong>{invitation.workspaceName}</strong>»
            </p>
            {!isLinkInvitation && invitation.email && (
              <>
                <p className="text-sm text-gray-500">Для: {invitation.email}</p>
                <p className="text-sm text-amber-600 mt-2">Вы вошли как: {currentUser?.email}</p>
              </>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-sm text-amber-900 m-0">
                {isLinkInvitation
                  ? "Это приглашение нельзя принять с текущим аккаунтом."
                  : "Это приглашение предназначено для другого email адреса. Пожалуйста, выйдите и войдите с правильным аккаунтом."}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => router.push(paths.auth.signout)}
                variant="link"
                className="flex-1 min-h-[44px] text-foreground"
              >
                Выйти
              </Button>
              {!isLinkInvitation && invitation.email && (
                <Button
                  onClick={() => {
                    const email = invitation.email;
                    if (email) {
                      router.push(`${paths.auth.signin}?email=${encodeURIComponent(email)}`);
                    }
                  }}
                  variant="dark"
                  className="flex-1 min-h-[44px]"
                >
                  Войти как {invitation.email.split("@")[0]}
                </Button>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-600">
              Нужна помощь?{" "}
              <Link
                href={paths.auth.signin}
                className="font-semibold text-gray-900 underline hover:text-gray-700 transition-colors"
              >
                Связаться с поддержкой
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Режим: Неавторизован, существующий пользователь — форма входа
  if (inviteMode === "login-existing") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] p-4">
        <div className="w-full max-w-[480px] rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          <div className="mb-8 text-center">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-blue-600 text-white font-bold text-2xl shadow-lg">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Войдите в аккаунт</h1>
            <p className="text-sm text-gray-600 mb-1">
              Приглашение в «<strong>{invitation.workspaceName}</strong>»
            </p>
            {invitation.email && <p className="text-sm text-gray-500">{invitation.email}</p>}
          </div>

          {error && (
            <div
              className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              role="alert"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="shrink-0 mt-0.5"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-blue-900 m-0">
                У вас уже есть аккаунт с email {invitation.email}. Войдите, чтобы присоединиться к
                компании.
              </p>
            </div>

            <Button
              onClick={() =>
                router.push(
                  `${paths.auth.signin}?email=${encodeURIComponent(invitation.email || "")}&redirect=${encodeURIComponent(`/invite/${token}`)}`,
                )
              }
              variant="dark"
              className="w-full min-h-[48px] text-base font-semibold"
            >
              Войти и присоединиться
            </Button>

            {isLinkInvitation && (
              <div className="text-center">
                <Button
                  onClick={() => setInviteMode("register-new")}
                  variant="link"
                  className="text-sm"
                >
                  Регистрация с другим email
                </Button>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-600">
              Нужна помощь?{" "}
              <Link
                href={paths.auth.signin}
                className="font-semibold text-gray-900 underline hover:text-gray-700 transition-colors"
              >
                Связаться с поддержкой
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Режим: Неавторизован, новый пользователь — регистрация
  if (inviteMode === "register-new") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] p-4">
        <div className="w-full max-w-[480px] rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          <div className="mb-8 text-center">
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold text-2xl shadow-lg">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Создайте аккаунт</h1>
            <p className="text-sm text-gray-600 mb-1">
              Вас пригласили в «<strong>{invitation.workspaceName}</strong>»
            </p>
            {!isLinkInvitation && invitation.email && (
              <p className="text-sm text-gray-500">{invitation.email}</p>
            )}
          </div>

          {error && (
            <div
              className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              role="alert"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="flex-shrink-0 mt-0.5"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
              {isLinkInvitation && (
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">
                        Email <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          className="w-full text-base"
                          autoComplete="email"
                          spellCheck={false}
                          disabled={submitting}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-500">
                        Введите ваш email адрес
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Ваше имя</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Как к вам обращаться"
                        className="w-full text-base"
                        autoComplete="name"
                        disabled={submitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">
                      Пароль <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="Минимум 8 символов"
                        className="w-full text-base"
                        autoComplete="new-password"
                        disabled={submitting}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-gray-500">
                      Используйте не менее 8 символов
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                variant="dark"
                className="mt-4 w-full min-h-[48px] text-base font-semibold"
                disabled={submitting}
              >
                {submitting ? "Создание аккаунта…" : "Принять приглашение"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 border-t border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-600">
              Уже есть аккаунт?{" "}
              <Link
                href={paths.auth.signin}
                className="font-semibold text-gray-900 underline hover:text-gray-700 transition-colors"
              >
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback — не должны сюда попасть
  return null;
}
