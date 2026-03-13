"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { login } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

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
    if (autoLoginAttempted) return; // Prevent multiple auto-login attempts

    const urlUsername = searchParams.get("username");
    const urlPassword = searchParams.get("password");

    if (urlUsername) {
      setUsername(decodeURIComponent(urlUsername));
    }
    if (urlPassword) {
      setPassword(decodeURIComponent(urlPassword));
    }

    // Auto-submit if both username and password are provided
    if (urlUsername && urlPassword && !autoLoginAttempted) {
      setAutoLoginAttempted(true);
      handleAutoLogin(
        decodeURIComponent(urlUsername),
        decodeURIComponent(urlPassword),
      );
    }
  }, [searchParams, autoLoginAttempted]);

  const handleAutoLogin = async (user: string, pass: string) => {
    setError("");
    setLoading(true);

    console.group("[Auto Login] Attempting auto login");
    console.log("Username:", user);
    console.log("Password length:", pass.length);
    console.groupEnd();

    try {
      const result = await login(user, pass);
      console.group("[Auto Login] Result");
      console.log("Success:", result.success);
      console.log("User:", result.user);
      console.groupEnd();

      if (result.success) {
        setTimeout(() => {
          router.push("/dashboard");
        }, 100);
      } else {
        setError(result.message || "Login failed");
      }
    } catch (err: any) {
      console.group("[Auto Login] Error");
      console.error("Error:", err);
      console.error("Response:", err.response);
      console.groupEnd();

      setError(err.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Log login attempt
    console.group("[Login] Attempting login");
    console.log("Username:", username);
    console.log("Password length:", password.length);
    console.log(
      "API URL:",
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    );
    console.log("Cookies before:", document.cookie);
    console.groupEnd();

    try {
      const result = await login(username, password);
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
        setError(result.message || "Login failed");
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
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">M</div>
          <h1 className="auth-title">С возвращением!</h1>
          <p className="auth-subtitle">Войдите в личный кабинет Mango Office</p>
        </div>

        {error && (
          <div className="auth-flash">
            <span>⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Электронная почта</label>
            <input
              type="email"
              name="username"
              className="form-control"
              placeholder="example@mail.com"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Пароль</label>
            <input
              type="password"
              name="password"
              className="form-control"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Вход..." : "Войти в систему"}
          </button>
        </form>

        <div className="auth-footer">
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
        <div className="auth-page">
          <div className="auth-card">
            <div style={{ textAlign: "center", padding: "40px" }}>
              Загрузка...
            </div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
