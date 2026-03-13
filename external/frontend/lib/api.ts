/** API client for backend communication. */

import axios, { type AxiosError, type AxiosInstance } from "axios";

// Get API URL from environment or use default
export const API_BASE_URL = (() => {
  if (typeof window !== "undefined") {
    // Client-side: use environment variable or detect from current location
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) {
      // Remove /api suffix if present (we add it in baseURL)
      return envUrl.replace(/\/(api|\/api\/)?$/, "");
    }
    // Fallback: use current origin for same-origin requests
    if (window.location.origin.includes("zvonki.qbs.ru")) {
      return "https://zvonki.qbs.ru";
    }
  }
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/(api|\/api\/)?$/, "") ||
    "http://localhost:7000"
  );
})();

// Log API URL for debugging
if (typeof window !== "undefined") {
  console.log("[API Config] API_BASE_URL:", API_BASE_URL);
  console.log(
    "[API Config] NEXT_PUBLIC_API_URL:",
    process.env.NEXT_PUBLIC_API_URL,
  );
  console.log("[API Config] Full baseURL:", `${API_BASE_URL}/api`);
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true, // Important for session cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper function to save logs persistently
const saveLog = (type: string, data: any) => {
  if (typeof window !== "undefined") {
    const timestamp = new Date().toISOString();
    const logEntry = { type, timestamp, data };

    // Save to console (with group to prevent clearing)
    console.group(`[${timestamp}] ${type}`);
    console.log(data);
    console.groupEnd();

    // Save to localStorage for persistence
    try {
      const logs = JSON.parse(localStorage.getItem("api_logs") || "[]");
      logs.push(logEntry);
      // Keep only last 50 logs
      if (logs.length > 50) logs.shift();
      localStorage.setItem("api_logs", JSON.stringify(logs));
    } catch (e) {
      // Ignore localStorage errors
    }
  }
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Log request for debugging
    if (typeof window !== "undefined") {
      const logData = {
        method: config.method?.toUpperCase(),
        url: config.url,
        fullURL: `${config.baseURL}${config.url}`,
        data: config.data,
        headers: config.headers,
      };
      saveLog("API Request", logData);
    }
    return config;
  },
  (error) => {
    saveLog("API Request Error", error);
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log successful response for debugging
    if (typeof window !== "undefined") {
      // Check if Set-Cookie header is present
      const setCookieHeader =
        response.headers["set-cookie"] || response.headers["Set-Cookie"];
      const logData = {
        status: response.status,
        statusText: response.statusText,
        url: response.config.url,
        fullURL: `${response.config.baseURL}${response.config.url}`,
        data: response.data,
        headers: Object.keys(response.headers),
        setCookie: setCookieHeader,
        cookies: document.cookie,
        allCookies: document.cookie.split(";").map((c) => c.trim()),
      };
      saveLog("API Response", logData);

      // Log cookie information
      if (setCookieHeader) {
        console.log("[Cookie] Set-Cookie header received:", setCookieHeader);
      } else {
        console.warn("[Cookie] No Set-Cookie header in response");
      }
      console.log("[Cookie] Current cookies:", document.cookie || "(none)");
    }
    return response;
  },
  (error: AxiosError) => {
    // Log error for debugging
    if (typeof window !== "undefined") {
      const logData = {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        fullURL: error.config
          ? `${error.config.baseURL}${error.config.url}`
          : "unknown",
        data: error.response?.data,
        message: error.message,
        code: error.code,
        cookies: document.cookie,
        stack: error.stack,
      };
      saveLog("API Error", logData);
    }
    if (error.response?.status === 401) {
      // Don't redirect immediately - let the component handle it
      // This prevents logs from being lost
    }
    return Promise.reject(error);
  },
);

// Export function to view saved logs
export const getSavedLogs = () => {
  if (typeof window !== "undefined") {
    try {
      const logs = JSON.parse(localStorage.getItem("api_logs") || "[]");
      return logs;
    } catch (e) {
      return [];
    }
  }
  return [];
};

// Export function to clear saved logs
export const clearSavedLogs = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("api_logs");
  }
};

// Make functions available globally for debugging
if (typeof window !== "undefined") {
  (window as any).getApiLogs = getSavedLogs;
  (window as any).clearApiLogs = clearSavedLogs;
}

export default api;
