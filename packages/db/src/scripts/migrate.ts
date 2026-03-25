import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { env } from "@calls/config";

if (!env.POSTGRES_URL) {
  throw new Error("Missing POSTGRES_URL");
}

const nonPoolingUrl = env.POSTGRES_URL.replace(":6543", ":5432");

async function runMigrations() {
  const pool = new Pool({ connectionString: nonPoolingUrl });
  const db = drizzle(pool);

  console.log("⏳ Running migrations...");

  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("✅ Migrations completed");

  await pool.end();
}

runMigrations().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});
