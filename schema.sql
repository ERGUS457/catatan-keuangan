-- Skema untuk fitur AI Gemini (Catatan Keuangan)
-- Jalankan manual di Neon SQL Editor sebelum fitur aktif.
-- Aman dijalankan ulang (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS user_settings (
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  setting_key     TEXT    NOT NULL,
  value_encrypted TEXT    NOT NULL,
  iv              TEXT    NOT NULL,
  auth_tag        TEXT    NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, setting_key)
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month      TEXT    NOT NULL,
  kind       TEXT    NOT NULL DEFAULT 'chat',
  role       TEXT    NOT NULL,
  content    TEXT    NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_messages_user_month_idx
  ON ai_messages (user_id, month, id DESC);
