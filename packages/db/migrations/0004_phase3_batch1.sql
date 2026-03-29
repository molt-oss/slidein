-- Migration: 0004_phase3_batch1
-- Phase 3 Batch 1: ブロードキャスト、スコアリング、自動化ルール

-- ブロードキャスト
CREATE TABLE IF NOT EXISTS broadcasts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  message_text TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'all' CHECK(target_type IN ('all', 'tag')),
  target_value TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'scheduled', 'sending', 'completed', 'failed')),
  scheduled_at TEXT,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_broadcasts_status ON broadcasts(status);
CREATE INDEX idx_broadcasts_scheduled ON broadcasts(status, scheduled_at);

-- スコアリングルール
CREATE TABLE IF NOT EXISTS scoring_rules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_type TEXT NOT NULL CHECK(event_type IN ('message_received', 'keyword_matched', 'link_clicked', 'scenario_completed')),
  points INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_scoring_rules_enabled ON scoring_rules(enabled);

-- contacts にスコア列を追加
ALTER TABLE contacts ADD COLUMN score INTEGER NOT NULL DEFAULT 0;

-- 自動化ルール
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  condition_json TEXT NOT NULL DEFAULT '{}',
  actions_json TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_automation_rules_enabled ON automation_rules(enabled, event_type);
