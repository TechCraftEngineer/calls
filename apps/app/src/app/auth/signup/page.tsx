"use client";

import { paths } from "@calls/config";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useForm } from "react-hook-form";
import { getCurrentUser, signUp } from "@/lib/auth";
import { authClient } from "@/lib/better-auth";
import { type CreateUserData, createUserSchema } from "@/lib/validations";

function RegisterForm() {
  const router = useRouter();

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) {
        router.replace(paths.root);
      }
    });
  }, [router]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: CreateUserData) => {
    try {
      const result = await signUp.email({
        email: data.username,
        password: data.password,
        name: `${data.givenName} ${data.familyName || ""}`.trim(),
      });

      if (result.error) {
        setError("root", {
          message: result.error.message || "Ошибка регистрации",
        });
      } else {
        setTimeout(() => {
          router.push(paths.auth.createWorkspace);
        }, 100);
      }
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : err instanceof Error
            ? err.message
            : "Ошибка регистрации";
      setError("root", {
        message: String(errorMessage || "Ошибка регистрации"),
      });
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
            Регистрация
          </h1>
          <p className="m-0 text-[14px] text-[#888]">
            Создайте аккаунт QBS Звонки
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
              htmlFor="username"
              className="mb-2 block text-[13px] font-semibold text-[#333]"
            >
              Электронная почта
            </label>
            <input
              id="username"
              type="email"
              className={`w-full rounded-lg border border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
                errors.username
                  ? "border-red-500 bg-red-50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(220,53,69,0.1)]"
                  : ""
              }`}
              placeholder="example@mail.com"
              autoComplete="email"
              {...register("username")}
            />
            {errors.username && (
              <div className="mt-1 text-xs leading-tight text-red-600">
                {errors.username.message}
              </div>
            )}
          </div>

          <div className="mb-5">
            <label
              htmlFor="givenName"
              className="mb-2 block text-[13px] font-semibold text-[#333]"
            >
              Имя
            </label>
            <input
              id="givenName"
              type="text"
              className={`w-full rounded-lg border border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
                errors.givenName
                  ? "border-red-500 bg-red-50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(220,53,69,0.1)]"
                  : ""
              }`}
              placeholder="Иван"
              autoComplete="given-name"
              {...register("givenName")}
            />
            {errors.givenName && (
              <div className="mt-1 text-xs leading-tight text-red-600">
                {errors.givenName.message}
              </div>
            )}
          </div>

          <div className="mb-5">
            <label
              htmlFor="familyName"
              className="mb-2 block text-[13px] font-semibold text-[#333]"
            >
              Фамилия
            </label>
            <input
              id="familyName"
              type="text"
              className={`w-full rounded-lg border border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
                errors.familyName
                  ? "border-red-500 bg-red-50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(220,53,69,0.1)]"
                  : ""
              }`}
              placeholder="Иванов"
              autoComplete="family-name"
              {...register("familyName")}
            />
            {errors.familyName && (
              <div className="mt-1 text-xs leading-tight text-red-600">
                {errors.familyName.message}
              </div>
            )}
          </div>

          <div className="mb-5">
            <label
              htmlFor="password"
              className="mb-2 block text-[13px] font-semibold text-[#333]"
            >
              Пароль
            </label>
            <input
              id="password"
              type="password"
              className={`w-full rounded-lg border border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
                errors.password
                  ? "border-red-500 bg-red-50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(220,53,69,0.1)]"
                  : ""
              }`}
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && (
              <div className="mt-1 text-xs leading-tight text-red-600">
                {errors.password.message}
              </div>
            )}
          </div>

          <div className="mb-5">
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-[13px] font-semibold text-[#333]"
            >
              Подтвердите пароль
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={`w-full rounded-lg border border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
                errors.confirmPassword
                  ? "border-red-500 bg-red-50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(220,53,69,0.1)]"
                  : ""
              }`}
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <div className="mt-1 text-xs leading-tight text-red-600">
                {errors.confirmPassword.message}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="mt-2 w-full cursor-pointer rounded-lg border-none bg-[#111] py-3 text-[15px] font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[#333] hover:-translate-y-px"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Регистрация…" : "Зарегистрироваться"}
          </button>

          {process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED !== "false" && (
            <div className="mt-4">
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#DDD]" />
                </div>
                <div className="relative flex justify-center text-[12px]">
                  <span className="bg-white px-2 text-[#888]">или</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  authClient.signIn.social({
                    provider: "google",
                    callbackURL: paths.auth.createWorkspace,
                  })
                }
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#DDD] bg-white py-3 text-[14px] font-medium text-[#333] transition-all hover:bg-[#F5F5F5]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Зарегистрироваться через Google
              </button>
            </div>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-[13px] text-[#888]">
            Уже есть аккаунт?{" "}
            <Link
              href={paths.auth.signin}
              className="font-semibold text-[#111] hover:text-[#333] transition-colors"
            >
              Войдите
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center text-[12px] text-[#AAA]">
          &copy; {new Date().getFullYear()} QBS Звонки. Все права защищены.
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
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
      <RegisterForm />
    </Suspense>
  );
}
