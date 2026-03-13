import { sql } from "drizzle-orm";
import { db } from "../client";

async function setupDb() {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  // Создаем UUIDv7 функцию для сортируемости по времени
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION uuidv7()
    RETURNS uuid AS $$
    DECLARE
      unix_ts_ms bytea;
      uuid_bytes bytea;
    BEGIN
      unix_ts_ms = substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
      uuid_bytes = unix_ts_ms || gen_random_bytes(10);
      uuid_bytes = set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
      uuid_bytes = set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
      RETURN encode(uuid_bytes, 'hex')::uuid;
    END
    $$ LANGUAGE plpgsql VOLATILE;
  `);

  await db.execute(sql`
    CREATE OR REPLACE FUNCTION workspace_id_generate()
    RETURNS text AS $$
    BEGIN
      RETURN 'ws_' || replace(uuidv7()::text, '-', '');
    END
    $$ LANGUAGE plpgsql VOLATILE;
  `);

  console.log("✅ Database setup complete");
}

if (require.main === module) {
  setupDb().catch(console.error);
}
