/**
 * Сбрасывает базу данных: удаляет все таблицы и объекты в схеме public
 */

import { sql } from "drizzle-orm";
import { Pool } from "pg";

async function dropDatabase() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("POSTGRES_URL is not set");
  }

  const pool = new Pool({ connectionString });

  try {
    console.log("🗑️ Dropping database schema...");

    await pool.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `);

    console.log("✅ Database schema dropped successfully");
  } finally {
    await pool.end();
  }
}

// Запускаем если выполняется напрямую
if (import.meta.main) {
  dropDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Failed to drop database:", err);
      process.exit(1);
    });
}

export { dropDatabase };
