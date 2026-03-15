import { Pool } from "pg";

async function dropSchema() {
  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error("POSTGRES_URL is not set");

  const pool = new Pool({
    connectionString: url.replace(":6543", ":5432"),
  });

  console.log("🗑️  Dropping database schema...");

  await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
  await pool.query("CREATE SCHEMA public");
  await pool.query("GRANT ALL ON SCHEMA public TO public");

  await pool.end();
  console.log("✅ Database schema dropped successfully!");
}

dropSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error dropping schema:", error);
    process.exit(1);
  });
