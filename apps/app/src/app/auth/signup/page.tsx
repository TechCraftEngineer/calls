"use client";

import { paths } from "@calls/config";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useForm } from "react-hook-form";
import { getCurrentUser, signUp } from "@/lib/better-auth";
import { type CreateUserData, createUserSchema } from "@/lib/validations";

function RegisterForm() {
  const router = useRouter();

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
  } = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: CreateUserData) => {
    try {
      const name = `${data.first_name} ${data.last_name || ""}`.trim();
      const result = await signUp.email({
        email: data.username,
        password: data.password,
        name: name || data.first_name,
        username: data.username,
      });

      if (result.error) {
        setError("root", {
          message: result.error.message || "Ошибка регистрации",
        });
      } else {
        setTimeout(() => {
          router.push(`${paths.auth.signin}?message=registration_success`);
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
            Создайте аккаунт Mango Office Call AI
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
              className={`w-full rounded-lg border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
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
              htmlFor="first_name"
              className="mb-2 block text-[13px] font-semibold text-[#333]"
            >
              Имя
            </label>
            <input
              id="first_name"
              type="text"
              className={`w-full rounded-lg border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
                errors.first_name
                  ? "border-red-500 bg-red-50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(220,53,69,0.1)]"
                  : ""
              }`}
              placeholder="Иван"
              autoComplete="given-name"
              {...register("first_name")}
            />
            {errors.first_name && (
              <div className="mt-1 text-xs leading-tight text-red-600">
                {errors.first_name.message}
              </div>
            )}
          </div>

          <div className="mb-5">
            <label
              htmlFor="last_name"
              className="mb-2 block text-[13px] font-semibold text-[#333]"
            >
              Фамилия
            </label>
            <input
              id="last_name"
              type="text"
              className={`w-full rounded-lg border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
                errors.last_name
                  ? "border-red-500 bg-red-50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(220,53,69,0.1)]"
                  : ""
              }`}
              placeholder="Иванов"
              autoComplete="family-name"
              {...register("last_name")}
            />
            {errors.last_name && (
              <div className="mt-1 text-xs leading-tight text-red-600">
                {errors.last_name.message}
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
              className={`w-full rounded-lg border-[#DDD] px-4 py-3 text-[14px] transition-all duration-200 box-border focus:border-[#FFD600] focus:shadow-[0_0_0_3px_rgba(255,214,0,0.1)] focus:outline-none ${
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
            {isSubmitting ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[13px] text-[#888]">
            Уже есть аккаунт?{" "}
            <a
              href={paths.auth.signin}
              className="font-semibold text-[#111] hover:text-[#333] transition-colors"
            >
              Войдите
            </a>
          </p>
        </div>

        <div className="mt-8 text-center text-[12px] text-[#AAA]">
          &copy; 2025 Mango Office Call AI. Все права защищены.
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
            <div className="py-10 text-center">Загрузка...</div>
          </div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
