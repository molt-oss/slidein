-- Migration: 0003_scenarios
-- Phase 2: シナリオ配信テーブル

-- シナリオ定義
CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK(trigger_type IN ('keyword', 'comment', 'api')),
  trigger_value TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_scenarios_enabled ON scenarios(enabled);
CREATE INDEX idx_scenarios_trigger ON scenarios(trigger_type, trigger_value);

-- シナリオステップ（各メッセージ）
CREATE TABLE IF NOT EXISTS scenario_steps (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  message_text TEXT NOT NULL,
  delay_seconds INTEGER NOT NULL DEFAULT 0,
  condition_tag TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_scenario_steps_scenario ON scenario_steps(scenario_id, step_order);

-- シナリオ進行状態（contact × scenario）
CREATE TABLE IF NOT EXISTS scenario_enrollments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  contact_id TEXT NOT NULL REFERENCES contacts(id),
  scenario_id TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  current_step_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
  next_send_at TEXT,
  enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_enrollments_status ON scenario_enrollments(status, next_send_at);
CREATE INDEX idx_enrollments_contact ON scenario_enrollments(contact_id, scenario_id);
