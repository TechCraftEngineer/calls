import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local" });

/**
 * Оптимизированная конфигурация Playwright
 * 
 * Основные улучшения:
 * - Параллельное выполнение тестов
 * - Уменьшенные таймауты
 * - Переиспользование браузерного контекста
 * - Отключение ненужных функций
 */
export default defineConfig({
  testDir: "./tests",
  
  // Включаем полный параллелизм
  fullyParallel: true,
  
  // Увеличиваем количество воркеров для параллелизации
  workers: process.env.CI ? 2 : "50%", // В CI - 2 воркера, локально - 50% CPU
  
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0, // Уменьшили с 3 до 2
  
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/results.xml" }],
  ],

  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    
    // Отключаем трейсинг по умолчанию - он медленный
    trace: process.env.CI ? "on-first-retry" : "off",
    
    // Скриншоты только при ошибках
    screenshot: "only-on-failure",
    
    // Видео только при ошибках
    video: "retain-on-failure",
    
    // Уменьшаем таймауты
    actionTimeout: 5000, // было 10000
    navigationTimeout: 15000, // было 30000
    
    // Отключаем touch event emulation для ускорения
    hasTouch: false,
    
    // Ускоряем загрузку страниц
    extraHTTPHeaders: {
      'Accept-Encoding': 'gzip, deflate',
    },
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        
        // Отключаем ненужные функции браузера
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            // --no-sandbox только для локальной разработки, не в CI
            ...(!process.env.CI ? ['--no-sandbox'] : []),
          ],
        },
      },
    },
  ],

  // Общий таймаут теста
  timeout: 30000, // было 60000
  
  // Таймаут для expect
  expect: {
    timeout: 5000, // было 10000
  },

  // Глобальная настройка для переиспользования контекста
  globalSetup: require.resolve('./global-setup'),
});
