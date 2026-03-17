"use client";

import { paths } from "@calls/config";
import { Button, PasswordInput } from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { authClient } from "@/lib/better-auth";
import {
  type ResetPasswordFormData,
  resetPasswordSchema,
} from "@/lib/validations";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    const t = searchParams.get("token");
    const err = searchParams.get("error");
    setToken(t);
    if (err === "INVALID_TOKEN") {
      setTokenError(
        "Ссылка недействительна или истекла. Запросите новый сброс пароля.",
      );
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError("root", {
        message: "Отсутствует токен сброса. Перейдите по ссылке из письма.",
      });
      return;
    }

    try {
      const result = await authClient.resetPassword({
        newPassword: data.newPassword,
        token,
      });

      if (result.error) {
        setError("root", {
          message: result.error.message || "Ошибка при сбросе пароля",
        });
        return;
      }
      setTimeout(
        () => router.push(`${paths.auth.signin}?message=password_reset`),
        1500,
      );
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Ошибка при сбросе пароля";
      setError("root", { message: String(errorMessage) });
    }
  };

  if (tokenError) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] font-[Inter]">
        <div className="w-full max-w-[420px] rounded-[16px] border-[#EEE] bg-white p-12 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
          <div className="mb-6 flex items-center gap-[10px] rounded-lg border-[#FFDADA] bg-[#FFF0F0] p-3 text-[13px] font-medium text-[#D32F2F]">
            <span>⚠️</span>
            {tokenError}
          </div>
          <Link
            href={paths.auth.forgotPassword}
            className="block w-full rounded-lg border-none bg-[#111] py-3 text-center text-[15px] font-semibold text-white no-underline transition-all hover:bg-[#333]"
          >
            Запросить новую ссылку
          </Link>
          <div className="mt-6 text-center">
            <Link
              href={paths.auth.signin}
              className="text-[13px] text-[#888] hover:text-[#111]"
            >
              ← Вернуться ко входу
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] font-[Inter]">
        <div className="max-w-[420px] rounded-[16px] border-[#EEE] bg-white p-12 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
          <div className="py-10 text-center">Загрузка…</div>
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
            Новый пароль
          </h1>
          <p className="m-0 text-[14px] text-[#888]">
            Введите новый пароль для входа в QBS Звонки
          </p>
        </div>

        {isSubmitSuccessful ? (
          <div className="flex items-center gap-[10px] rounded-lg border-[#4CAF50] bg-[#E8F5E8] p-3 text-[13px] font-medium text-[#2E7D32]">
            <span>✅</span>
            Пароль изменён! Перенаправляем на страницу входа…
          </div>
        ) : (
          <>
            {errors.root && (
              <div className="mb-6 flex items-center gap-[10px] rounded-lg border-[#FFDADA] bg-[#FFF0F0] p-3 text-[13px] font-medium text-[#D32F2F]">
                <span>⚠️</span>
                {errors.root.message}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="mb-5">
                <label
                  htmlFor="newPassword"
                  className="mb-2 block text-[13px] font-semibold text-[#333]"
                >
                  Новый пароль
                </label>
                <PasswordInput
                  id="newPassword"
                  className={`w-full rounded-lg border border-[#DDD] px-4 py-3 pr-10 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
                    errors.newPassword
                      ? "border-red-500 bg-red-50 focus:border-red-500"
                      : ""
                  }`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={!!errors.newPassword}
                  {...register("newPassword")}
                />
                {errors.newPassword && (
                  <div className="mt-1 text-xs leading-tight text-red-600">
                    {errors.newPassword.message}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="dark"
                size="touch"
                className="mt-2 w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Сохранение…" : "Сохранить пароль"}
              </Button>
            </form>
          </>
        )}

        <div className="mt-6 text-center">
          <Link
            href={paths.auth.signin}
            className="text-[13px] font-semibold text-[#111] hover:text-[#333] transition-colors"
          >
            ← Вернуться ко входу
          </Link>
        </div>

        <div className="mt-8 text-center text-[12px] text-[#AAA]">
          &copy; {new Date().getFullYear()} QBS Звонки. Все права защищены.
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] font-[Inter]">
          <div className="max-w-[420px] rounded-[16px] border-[#EEE] bg-white p-12 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
            <div className="py-10 text-center">Загрузка…</div>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
