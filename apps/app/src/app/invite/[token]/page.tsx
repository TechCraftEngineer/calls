"use client";

import { paths } from "@calls/config";
import { Button, Input, PasswordInput } from "@calls/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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

  const {
    data: invitation,
    isLoading,
    error: fetchError,
  } = useQuery({
    ...orpc.workspaces.getInvitationByToken.queryOptions({ input: { token } }),
    enabled: !!token,
  });

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
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FB]">
        <div className="text-center">
          <p className="text-[#666]">Неверная ссылка приглашения</p>
          <Link
            href={paths.auth.signin}
            className="mt-4 inline-block text-[#111] underline"
          >
            Войти
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FB]">
        <div className="text-[#666]">Загрузка…</div>
      </div>
    );
  }

  if (fetchError || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FB]">
        <div className="w-full max-w-[420px] rounded-2xl border border-[#EEE] bg-white p-8 text-center shadow-sm">
          <h1 className="mb-2 text-xl font-bold text-[#111]">
            Приглашение не найдено
          </h1>
          <p className="mb-6 text-sm text-[#666]">
            Ссылка приглашения истекла или недействительна.
          </p>
          <Link
            href={paths.auth.signin}
            className="inline-block rounded-lg bg-[#111] px-6 py-2.5 text-sm font-semibold text-white no-underline hover:bg-[#333]"
          >
            Войти
          </Link>
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
            Приглашение в рабочее пространство
          </h1>
          <p className="m-0 text-[14px] text-[#888]">
            Вас пригласили в «{invitation.workspaceName}». Задайте пароль для
            входа.
          </p>
          <p className="mt-2 text-[13px] text-[#666]">{invitation.email}</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-[10px] rounded-lg border-[#FFDADA] bg-[#FFF0F0] p-3 text-[13px] font-medium text-[#D32F2F]">
            <span>⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-[13px] font-semibold text-[#333]"
            >
              Имя
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как к вам обращаться"
              className="w-full"
              autoComplete="name"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-[13px] font-semibold text-[#333]"
            >
              Пароль *
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 8 символов"
              className="w-full"
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-[13px] font-semibold text-[#333]"
            >
              Подтвердите пароль *
            </label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
              className="w-full"
              autoComplete="new-password"
              required
            />
          </div>

          <Button
            type="submit"
            variant="accent"
            className="mt-2 w-full"
            disabled={submitting}
          >
            {submitting ? "Создание аккаунта…" : "Принять приглашение"}
          </Button>
        </form>

        <p className="mt-6 text-center text-[12px] text-[#999]">
          Уже есть аккаунт?{" "}
          <Link href={paths.auth.signin} className="text-[#111] underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
