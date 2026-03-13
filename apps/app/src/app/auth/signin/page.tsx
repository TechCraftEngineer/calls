"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
        router.replace("/dashboard");
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
          router.push("/dashboard");
        }, 100);
      } else {
        setError("root", { message: result.message || "Login failed" });
      }
    } catch (err: unknown) {
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response
              ?.data?.detail
          : err instanceof Error
            ? err.message
            : "Invalid credentials";
      setError("root", {
        message: String(errorMessage || "Invalid credentials"),
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 w-full font-sans">
      <div className="bg-white p-12 rounded-2xl shadow-soft border border-gray-200 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-mango-yellow text-black font-black text-2xl rounded-lg mb-6">
            M
          </div>
          <h1 className="text-2xl font-bold text-primary-900 mb-2">
            С возвращением!
          </h1>
          <p className="text-sm text-gray-600 m-0">
            Войдите в личный кабинет Mango Office
          </p>
        </div>

        {errors.root && (
          <div className="mb-6 p-3 rounded-lg text-sm font-medium flex items-center gap-2.5 bg-error-50 text-error-600 border border-error-200">
            <span>⚠️</span>
            {errors.root.message}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-semibold text-primary-800 mb-2"
            >
              Имя пользователя
            </label>
            <input
              id="username"
              type="text"
              className={`w-full px-4 py-3 border rounded-lg text-sm transition-all duration-200 box-border ${
                errors.username
                  ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                  : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
              }`}
              placeholder="username"
              autoComplete="username"
              {...register("username")}
            />
            {errors.username && (
              <div className="text-error-600 text-xs mt-1 leading-tight">
                {errors.username.message}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-primary-800 mb-2"
            >
              Пароль
            </label>
            <input
              id="password"
              type="password"
              className={`w-full px-4 py-3 border rounded-lg text-sm transition-all duration-200 box-border ${
                errors.password
                  ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                  : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
              }`}
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <div className="text-error-600 text-xs mt-1 leading-tight">
                {errors.password.message}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary-900 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all duration-200 mt-2 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-primary-800 hover:-translate-y-px"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Вход..." : "Войти в систему"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-400">
          &copy; 2025 Mango Office Call AI. Все права защищены.
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 w-full font-sans">
          <div className="bg-white p-12 rounded-2xl shadow-soft border border-gray-200 w-full max-w-md">
            <div className="text-center py-10">Загрузка...</div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
