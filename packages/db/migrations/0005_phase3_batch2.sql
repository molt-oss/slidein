-- Migration: 0005_phase3_batch2
-- Phase 3 Batch 2: トラッキングリンク、配信時間帯制御、Webhook OUT、CV計測、フォーム

-- トラッキングリンク
CREATE TABLE IF NOT EXISTS tracked_links (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  original_url TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  contact_tag TEXT,
  scenario_id TEXT,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_tracked_links_short_code ON tracked_links(short_code);

-- リンククリック記録
CREATE TABLE IF NOT EXISTS link_clicks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tracked_link_id TEXT NOT NULL REFERENCES tracked_links(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  clicked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_link_clicks_link ON link_clicks(tracked_link_id);
CREATE INDEX idx_link_clicks_contact ON link_clicks(contact_id);

-- 配信時間帯設定
CREATE TABLE IF NOT EXISTS delivery_settings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  start_hour INTEGER NOT NULL DEFAULT 9,
  end_hour INTEGER NOT NULL DEFAULT 23,
  timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo'
);

-- デフォルト行を挿入
INSERT INTO delivery_settings (id, start_hour, end_hour, timezone)
VALUES ('default', 9, 23, 'Asia/Tokyo');

-- Webhook エンドポイント
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  url TEXT NOT NULL,
  events TEXT NOT NULL DEFAULT '[]',
  secret TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_webhook_endpoints_enabled ON webhook_endpoints(enabled);

-- コンバージョンゴール
CREATE TABLE IF NOT EXISTS conversion_goals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  target_value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- コンバージョン記録
CREATE TABLE IF NOT EXISTS conversions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  goal_id TEXT NOT NULL REFERENCES conversion_goals(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  converted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_conversions_goal ON conversions(goal_id);
CREATE INDEX idx_conversions_contact ON conversions(contact_id);

-- フォーム
CREATE TABLE IF NOT EXISTS forms (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  fields TEXT NOT NULL DEFAULT '[]',
  thank_you_message TEXT NOT NULL DEFAULT 'Thank you!',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- フォーム回答
CREATE TABLE IF NOT EXISTS form_responses (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  form_id TEXT NOT NULL REFERENCES forms(id),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  responses TEXT NOT NULL DEFAULT '{}',
  current_field_index INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_form_responses_form ON form_responses(form_id);
CREATE INDEX idx_form_responses_contact ON form_responses(contact_id);
CREATE INDEX idx_form_responses_active ON form_responses(contact_id, completed_at);
