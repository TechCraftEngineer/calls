#!/usr/bin/env node

/**
 * Health check script - проверяет состояние всех компонентов системы
 */

import { createLogger } from "@calls/api/logger";
import { usersService } from "@calls/db";

const logger = createLogger("health-check");

async function checkDatabase() {
  try {
    await usersService.getUser(1);
    logger.info("✅ Database connection: OK");
    return true;
  } catch (error) {
    logger.error("❌ Database connection: FAILED", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function checkUsersTable() {
  try {
    const users = await usersService.getAllUsers();
    logger.info(`✅ Users table: OK (${users.length} users found)`);
    return true;
  } catch (error) {
    logger.error("❌ Users table: FAILED", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function main() {
  logger.info("🔍 Starting health check...");

  const checks = [
    { name: "Database", fn: checkDatabase },
    { name: "Users Table", fn: checkUsersTable },
  ];

  let allPassed = true;

  for (const check of checks) {
    const passed = await check.fn();
    if (!passed) allPassed = false;
  }

  if (allPassed) {
    logger.info("✅ All health checks passed!");
    process.exit(0);
  } else {
    logger.error("❌ Some health checks failed!");
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Health check script failed", { error });
  process.exit(1);
});
