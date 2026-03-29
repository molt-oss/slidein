-- Migration: 0001_initial_schema
-- Phase 1 テーブル定義

-- コンタクト情報
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ig_user_id TEXT NOT NULL UNIQUE,
  username TEXT,
  display_name TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_message_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_contacts_ig_user_id ON contacts(ig_user_id);

-- キーワード応答ルール
CREATE TABLE IF NOT EXISTS keyword_rules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  keyword TEXT NOT NULL,
  match_type TEXT NOT NULL CHECK(match_type IN ('exact', 'contains', 'regex')),
  response_text TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_keyword_rules_enabled ON keyword_rules(enabled);

-- コメント→DMトリガー
CREATE TABLE IF NOT EXISTS comment_triggers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  media_id_filter TEXT,
  keyword_filter TEXT,
  dm_response_text TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_comment_triggers_enabled ON comment_triggers(enabled);

-- メッセージログ
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  direction TEXT NOT NULL CHECK(direction IN ('in', 'out')),
  content TEXT NOT NULL,
  ig_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_messages_contact_id ON messages(contact_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- レート制限トークンバケット
CREATE TABLE IF NOT EXISTS rate_limit_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  bucket_key TEXT NOT NULL UNIQUE,
  tokens INTEGER NOT NULL DEFAULT 200,
  last_refill_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_rate_limit_bucket_key ON rate_limit_tokens(bucket_key);
