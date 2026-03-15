"use client";

import { paths } from "@calls/config";
import { Button, Input, PasswordInput } from "@calls/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getAPI_BASE_URL } from "@/lib/orpc";
import { useORPC } from "@/orpc/react";

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const orpc = useORPC();
  const token = typeof params.token === "string" ? params.token : "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const {
    data: invitation,
    isLoading,
    error: fetchError,
  } = useQuery({
    ...orpc.workspaces.getInvitationByToken.queryOptions({ input: { token } }),
    enabled: !!token,
  });

  useEffect(() => {
    getCurrentUser().then((user) => {
      setCurrentUser(user);
      setCheckingAuth(false);
    });
  }, []);

  useEffect(() => {
    if (invitation && !isLoading && !checkingAuth && !currentUser) {
      nameInputRef.current?.focus();
    }
  }, [invitation, isLoading, checkingAuth, currentUser]);

  const handleAcceptForExistingUser = async () => {
    if (!currentUser || !invitation) return;

    if (currentUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
      setError(
        `Это приглашение предназначено для ${invitation.email}. Вы вошли как ${currentUser.email}. Пожалуйста, выйдите и войдите с правильным аккаунтом.`,
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const baseUrl = getAPI_BASE_URL();
      const res = await fetch(`${baseUrl}/api/invitations/accept-existing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token }),
      });

      const data = (await res.json()) as {
        error?: string;
        success?: boolean;
        workspaceId?: string;
        workspaceName?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Не удалось принять приглашение");
        return;
      }

      router.push(`/?workspace=${data.workspaceId}&message=joined`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось принять приглашение",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || password.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setSubmitting(true);
    try {
      const baseUrl = getAPI_BASE_URL();
      const res = await fetch(`${baseUrl}/api/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          name: name.trim() || undefined,
        }),
      });

      const data = (await res.json()) as { error?: string; success?: boolean };

      if (!res.ok) {
        setError(data.error ?? "Не удалось принять приглашение");
        return;
      }

      router.push(
        `${paths.auth.signin}?message=invite_accepted&email=${encodeURIComponent(invitation?.email ?? "")}`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось принять приглашение",
      );
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Неверная ссылка
          </h1>
          <p className="text-gray-600 mb-6">
            Ссылка приглашения некорректна или отсутствует
          </p>
          <Link
            href={paths.auth.signin}
            className="inline-block rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white no-underline hover:bg-gray-800 transition-colors min-h-[44px] flex items-center justify-center"
          >
            Перейти ко входу
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FB]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
          <p className="text-gray-600">Загрузка…</p>
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
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Приглашение не найдено
          </h1>
          <p className="mb-6 text-sm text-gray-600">
            Ссылка приглашения истекла или недействительна. Попросите
            администратора отправить новое приглашение.
          </p>
          <Link
            href={paths.auth.signin}
            className="inline-block rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white no-underline hover:bg-gray-800 transition-colors min-h-[44px] flex items-center justify-center"
          >
            Перейти ко входу
          </Link>
        </div>
      </div>
    );
  }

  if (currentUser && invitation) {
    const isCorrectEmail =
      currentUser.email.toLowerCase() === invitation.email.toLowerCase();

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
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              {isCorrectEmail
                ? "Присоединиться к workspace"
                : "Несоответствие email"}
            </h1>
            <p className="text-sm text-gray-600 mb-1">
              Приглашение в «<strong>{invitation.workspaceName}</strong>»
            </p>
            <p className="text-sm text-gray-500">Для: {invitation.email}</p>
            {!isCorrectEmail && (
              <p className="text-sm text-amber-600 mt-2">
                Вы вошли как: {currentUser.email}
              </p>
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

          {isCorrectEmail ? (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-sm text-blue-900 m-0">
                  Вы уже авторизованы. Нажмите кнопку ниже, чтобы присоединиться
                  к workspace.
                </p>
              </div>

              <Button
                onClick={handleAcceptForExistingUser}
                variant="accent"
                className="w-full min-h-[48px] text-base font-semibold"
                disabled={submitting}
              >
                {submitting ? "Присоединение…" : "Присоединиться к workspace"}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <p className="text-sm text-amber-900 m-0">
                  Это приглашение предназначено для другого email адреса.
                  Пожалуйста, выйдите и войдите с правильным аккаунтом или
                  создайте новый.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => router.push(paths.auth.signout)}
                  variant="outline"
                  className="flex-1 min-h-[44px]"
                >
                  Выйти
                </Button>
                <Button
                  onClick={() =>
                    router.push(
                      `${paths.auth.signin}?email=${encodeURIComponent(invitation.email)}`,
                    )
                  }
                  variant="accent"
                  className="flex-1 min-h-[44px]"
                >
                  Войти как {invitation.email.split("@")[0]}
                </Button>
              </div>
            </div>
          )}

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
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Присоединяйтесь к workspace
          </h1>
          <p className="text-sm text-gray-600 mb-1">
            Вас пригласили в «<strong>{invitation.workspaceName}</strong>»
          </p>
          <p className="text-sm text-gray-500">{invitation.email}</p>
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Ваше имя
            </label>
            <Input
              ref={nameInputRef}
              id="name"
              type="text"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как к вам обращаться"
              className="w-full text-base"
              autoComplete="name"
              disabled={submitting}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Пароль <span className="text-red-500">*</span>
            </label>
            <PasswordInput
              id="password"
              name="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 8 символов"
              className="w-full text-base"
              autoComplete="new-password"
              required
              disabled={submitting}
              aria-describedby="password-hint"
            />
            <p id="password-hint" className="mt-1 text-xs text-gray-500">
              Используйте не менее 8 символов
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Подтвердите пароль <span className="text-red-500">*</span>
            </label>
            <PasswordInput
              id="confirmPassword"
              name="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
              className="w-full text-base"
              autoComplete="new-password"
              required
              disabled={submitting}
            />
          </div>

          <Button
            type="submit"
            variant="accent"
            className="mt-4 w-full min-h-[48px] text-base font-semibold"
            disabled={submitting}
          >
            {submitting ? "Создание аккаунта…" : "Принять приглашение"}
          </Button>
        </form>

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
