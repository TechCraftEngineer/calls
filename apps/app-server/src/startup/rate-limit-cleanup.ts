import { createLogger } from "@calls/api";
import { rateLimitMap } from "../lib/rate-limit";
import { cleanupAllCaches } from "../lib/session-cache";

const processLogger = createLogger("backend-server");

interface CleanupIntervalControl {
  startCleanupInterval: () => void;
  stopCleanupInterval: () => void;
}

declare global {
  var __cleanupIntervalControl: CleanupIntervalControl | undefined;
}

let cleanupInterval: NodeJS.Timeout | null = null;

export const startCleanupInterval = () => {
  if (cleanupInterval) return; // Предотвращаем дублирование интервалов

  cleanupInterval = setInterval(
    () => {
      try {
        cleanupAllCaches(rateLimitMap);
      } catch (error) {
        processLogger.error("cleanupAllCaches failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    5 * 60 * 1000,
  );
};

export const stopCleanupInterval = () => {
  if (!cleanupInterval) return;

  clearInterval(cleanupInterval);
  cleanupInterval = null;
};

export const setupCleanupIntervalForTests = () => {
  if (process.env.NODE_ENV !== "test") return;

  globalThis.__cleanupIntervalControl = {
    startCleanupInterval,
    stopCleanupInterval,
  };
};

export const ensureCleanupIntervalStarted = () => {
  startCleanupInterval();
  setupCleanupIntervalForTests();
};
