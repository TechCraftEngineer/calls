/**
 * Тестовый скрипт для проверки установки паролей через Better Auth
 */

import { createLogger } from "@calls/api";

const logger = createLogger("test-password");

async function testPasswordSet() {
  logger.info("Starting password test");

  // Здесь можно добавить тестовые вызовы API
  // для проверки установки паролей

  logger.info("Password test completed");
}

if (require.main === module) {
  testPasswordSet().catch(console.error);
}

export { testPasswordSet };
