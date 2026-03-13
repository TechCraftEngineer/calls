"use client";

import { paths } from "@calls/config";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useForm } from "react-hook-form";
import { getCurrentUser, login } from "@/lib/auth";
import { type LoginFormData, loginSchema } from "@/lib/validations";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) {
        router.replace(paths.dashboard.root);
      }
    });
  }, [router]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  useEffect(() => {
    const urlUsername = searchParams.get("username");
    const urlPassword = searchParams.get("password");

    if (urlUsername) {
      setValue("username", decodeURIComponent(urlUsername));
    }
    if (urlPassword) {
      setValue("password", decodeURIComponent(urlPassword));
    }

    if (urlUsername && urlPassword) {
      const form = document.querySelector("form");
      if (form) {
        setTimeout(() => {
          form.dispatchEvent(new Event("submit", { cancelable: true }));
        }, 100);
      }
    }
  }, [searchParams, setValue]);

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data.username, data.password);

      if (result.success) {
        setTimeout(() => {
          router.push(paths.dashboard.root);
        }, 100);
      } else {
        setError("root", { message: result.message || "Ошибка входа" });
      }
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : err instanceof Error
            ? err.message
            : "Неверный логин или пароль";
      setError("root", {
        message: String(errorMessage || "Неверный логин или пароль"),
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
            С возвращением!
          </h1>
          <p className="m-0 text-[14px] text-[#888]">
            Войдите в личный кабинет QBS Звонки
          </p>
        </div>

        {errors.root && (
          <div className="mb-6 flex items-center gap-[10px] rounded-lg border-[#FFDADA] bg-[#FFF0F0] p-3 text-[13px] font-medium text-[#D32F2F]">
            <span>⚠️</span>
            {errors.root.message}
          </div>
        )}

        {searchParams.get("message") === "registration_success" && (
          <div className="mb-6 flex items-center gap-[10px] rounded-lg border-[#4CAF50] bg-[#E8F5E8] p-3 text-[13px] font-medium text-[#2E7D32]">
            <span>✅</span>
            Регистрация прошла успешно! Теперь вы можете войти в систему.
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
              className={`w-full rounded-lg border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
                errors.username
                  ? "border-red-500 bg-red-50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(220,53,69,0.1)]"
                  : ""
              }`}
              placeholder="example@mail.com"
              autoComplete="username"
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
              htmlFor="password"
              className="mb-2 block text-[13px] font-semibold text-[#333]"
            >
              Пароль
            </label>
            <input
              id="password"
              type="password"
              className={`w-full rounded-lg border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
                errors.password
                  ? "border-red-500 bg-red-50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(220,53,69,0.1)]"
                  : ""
              }`}
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <div className="mt-1 text-xs leading-tight text-red-600">
                {errors.password.message}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="mt-2 w-full cursor-pointer rounded-lg border-none bg-[#111] py-3 text-[15px] font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-[#333] hover:-translate-y-px"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Вход..." : "Войти в систему"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[13px] text-[#888]">
            Нет аккаунта?{" "}
            <Link
              href={paths.auth.signup}
              className="font-semibold text-[#111] hover:text-[#333] transition-colors"
            >
              Зарегистрируйтесь
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center text-[12px] text-[#AAA]">
          &copy; 2025 QBS Звонки. Все права защищены.
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-[#F8F9FB] font-[Inter]">
          <div className="w-full max-w-[420px] rounded-[16px] border-[#EEE] bg-white p-12 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
            <div className="py-10 text-center">Загрузка...</div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
