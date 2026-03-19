import { rateLimitMap } from "../lib/rate-limit";
import { cleanupAllCaches } from "../lib/session-cache";

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
    () => cleanupAllCaches(rateLimitMap),
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
