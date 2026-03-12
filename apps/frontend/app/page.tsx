"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useForm } from "react-hook-form";
import { login } from "@/lib/auth";
import { type LoginFormData, loginSchema } from "@/lib/validations";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // Load and display saved logs on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedLogs = localStorage.getItem("api_logs");
        if (savedLogs) {
          const logs = JSON.parse(savedLogs);
          console.group("[Saved API Logs]");
          logs.forEach((log: any) => {
            console.log(`[${log.timestamp}] ${log.type}:`, log.data);
          });
          console.groupEnd();
          console.log(
            '💡 Tip: Use localStorage.getItem("api_logs") to see all saved logs',
          );
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }, []);

  // Read username and password from URL query params
  useEffect(() => {
    const urlUsername = searchParams.get("username");
    const urlPassword = searchParams.get("password");

    if (urlUsername) {
      setValue("username", decodeURIComponent(urlUsername));
    }
    if (urlPassword) {
      setValue("password", decodeURIComponent(urlPassword));
    }

    // Auto-submit if both username and password are provided
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
      console.group("[Login] Attempting login");
      console.log("Username:", data.username);
      console.log("Password length:", data.password.length);
      console.log(
        "API URL:",
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
      );
      console.log("Cookies before:", document.cookie);
      console.groupEnd();

      const result = await login(data.username, data.password);

      console.group("[Login] Login result");
      console.log("Success:", result.success);
      console.log("User:", result.user);
      console.log("Message:", result.message);
      console.log("Cookies after:", document.cookie);
      console.groupEnd();

      if (result.success) {
        // Wait a bit before redirect to ensure logs are saved
        setTimeout(() => {
          router.push("/dashboard");
        }, 100);
      } else {
        setError("root", { message: result.message || "Login failed" });
      }
    } catch (err: any) {
      console.group("[Login] Login error");
      console.error("Error object:", err);
      console.error("Response:", err.response);
      console.error("Response data:", err.response?.data);
      console.error("Response status:", err.response?.status);
      console.error("Message:", err.message);
      console.error("Cookies:", document.cookie);
      console.groupEnd();

      const errorMessage =
        err.response?.data?.detail || err.message || "Invalid credentials";
      setError("root", { message: errorMessage });
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
              Электронная почта
            </label>
            <input
              id="username"
              type="email"
              className={`w-full px-4 py-3 border rounded-lg text-sm transition-all duration-200 box-border ${
                errors.username
                  ? "border-error-500 bg-error-50 focus:border-error-500 focus:ring-2 focus:ring-error-200"
                  : "border-gray-300 focus:border-mango-yellow focus:ring-2 focus:ring-mango-yellow/20"
              }`}
              placeholder="example@mail.com"
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

export default function LoginPage() {
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
