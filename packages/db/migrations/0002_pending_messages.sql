-- Migration: 0002_pending_messages
-- レート制限超過時のメッセージキュー

CREATE TABLE IF NOT EXISTS pending_messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  recipient_ig_id TEXT NOT NULL,
  content TEXT NOT NULL,
  scheduled_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_pending_messages_status ON pending_messages(status, scheduled_at);
