import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import { resolve } from "path";

// Загружаем переменные окружения из корня репозитория (CI пишет .env.local туда)
config({ path: resolve(__dirname, "..", "..", ".env.local") });

/**
 * Конфигурация Playwright для тестирования аутентификации
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/results.xml" }],
  ],

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  timeout: 60000,
  expect: {
    timeout: 10000,
  },

  // webServer запускается вручную для отладки
  // webServer: {
  //   command: "cd ../../apps/app && bun run dev",
  //   url: "http://localhost:3000/api/health",
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 180000,
  // },
});
