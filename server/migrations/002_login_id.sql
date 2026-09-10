ALTER TABLE users ADD COLUMN login_id TEXT;
UPDATE users SET login_id = 'user_' || substr(id, 1, 12) WHERE login_id IS NULL OR login_id = '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_id ON users(login_id);
