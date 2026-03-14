-- Add UUIDv7 generation function for PostgreSQL
-- UUIDv7 provides time-ordered UUIDs which are better for database performance

-- Check PostgreSQL version and use appropriate method
DO $$
BEGIN
  -- For PostgreSQL 17+, use built-in gen_random_uuid_v7()
  IF current_setting('server_version_num')::int >= 170000 THEN
    CREATE OR REPLACE FUNCTION uuidv7() RETURNS uuid AS $func$
      SELECT gen_random_uuid_v7();
    $func$ LANGUAGE SQL VOLATILE;
  ELSE
    -- For older versions, implement UUIDv7 manually
    CREATE OR REPLACE FUNCTION uuidv7() RETURNS uuid AS $func$
    DECLARE
      unix_ts_ms bytea;
      uuid_bytes bytea;
    BEGIN
      unix_ts_ms = substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
      
      -- Generate random bytes for the rest
      uuid_bytes = unix_ts_ms || gen_random_bytes(10);
      
      -- Set version (7) and variant bits
      uuid_bytes = set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
      uuid_bytes = set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
      
      RETURN encode(uuid_bytes, 'hex')::uuid;
    END;
    $func$ LANGUAGE plpgsql VOLATILE;
  END IF;
END $$;

-- Add comment
COMMENT ON FUNCTION uuidv7() IS 'Generate time-ordered UUID v7 for better database performance';
