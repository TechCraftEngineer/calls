-- Add deletedAt column for soft delete
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS user_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS user_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS user_telegram_token_idx ON users(telegram_connect_token);
CREATE INDEX IF NOT EXISTS user_deleted_at_idx ON users(deleted_at);

-- Add comment
COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user was soft deleted';
