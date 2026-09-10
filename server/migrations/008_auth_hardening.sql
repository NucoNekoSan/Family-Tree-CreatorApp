ALTER TABLE sessions ADD COLUMN last_seen_at TEXT;
UPDATE sessions SET last_seen_at = created_at WHERE last_seen_at IS NULL;

ALTER TABLE login_attempts ADD COLUMN identifier_hash TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_attempts_identity_time ON login_attempts(ip,action,identifier_hash,attempted_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON sessions(user_id,created_at DESC);
