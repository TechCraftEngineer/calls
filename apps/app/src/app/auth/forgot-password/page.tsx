"use client";

import { paths } from "@calls/config";
import { Button, Input } from "@calls/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { authClient } from "@/lib/better-auth";
import {
  type ForgotPasswordFormData,
  forgotPasswordSchema,
} from "@/lib/validations";

function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}${paths.auth.resetPassword}`
          : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${paths.auth.resetPassword}`;

      const result = await authClient.requestPasswordReset({
        email: data.email,
        redirectTo,
      });

      if (result.error) {
        setError("root", {
          message: result.error.message || "Ошибка при отправке письма",
        });
        return;
      }
      // Всегда показываем успех (защита от перебора email)
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Ошибка при отправке письма";
      setError("root", { message: String(errorMessage) });
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] font-[Inter]">
      <div className="w-full max-w-[420px] rounded-[16px] border-[#EEE] bg-white p-12 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        <div className="mb-8 text-center">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#FFD600] text-black font-black text-[24px]">
            M
          </div>
          <h1 className="mb-2 text-[24px] font-bold text-[#111]">
            Восстановление пароля
          </h1>
          <p className="m-0 text-[14px] text-[#888]">
            Введите email — мы отправим ссылку для сброса пароля
          </p>
        </div>

        {isSubmitSuccessful ? (
          <div className="space-y-6">
            <div className="flex items-center gap-[10px] rounded-lg border-[#4CAF50] bg-[#E8F5E8] p-3 text-[13px] font-medium text-[#2E7D32]">
              <span>✅</span>
              Письмо отправлено. Проверьте почту и перейдите по ссылке для
              сброса пароля.
            </div>
            <Link
              href={paths.auth.signin}
              className="block w-full rounded-lg border-none bg-[#111] py-3 text-center text-[15px] font-semibold text-white no-underline transition-all hover:bg-[#333]"
            >
              Вернуться ко входу
            </Link>
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
                  htmlFor="email"
                  className="mb-2 block text-[13px] font-semibold text-[#333]"
                >
                  Электронная почта
                </label>
                <Input
                  id="email"
                  type="email"
                  className={`w-full rounded-lg border border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
                    errors.email
                      ? "border-red-500 bg-red-50 focus:border-red-500"
                      : ""
                  }`}
                  placeholder="example@mail.com"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email && (
                  <div className="mt-1 text-xs leading-tight text-red-600">
                    {errors.email.message}
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
                {isSubmitting ? "Отправка…" : "Отправить ссылку"}
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

export default function ForgotPasswordPage() {
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
      <ForgotPasswordForm />
    </Suspense>
  );
}
