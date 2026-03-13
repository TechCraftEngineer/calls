#!/usr/bin/env node

/**
 * Quick restart script для backend сервера
 */

import { execSync } from "child_process";

console.log("🔄 Перезапускаем backend сервер...");

try {
  // Останавливаем текущий процесс (если есть)
  try {
    execSync("pkill -f 'apps/app-server'", { stdio: "inherit" });
  } catch (e) {
    // Процесс может не быть запущен - это нормально
  }

  // Ждем 2 секунды
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Запускаем сервер заново
  console.log("🚀 Запускаем backend сервер...");
  execSync("cd apps/app-server && npm run dev", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
} catch (error) {
  console.error("❌ Ошибка перезапуска:", error);
  process.exit(1);
}
