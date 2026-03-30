CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  ig_account_id TEXT NOT NULL UNIQUE,
  ig_username TEXT,
  meta_access_token TEXT NOT NULL,
  meta_app_secret TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO accounts (id, name, ig_account_id, meta_access_token, meta_app_secret)
VALUES ('default', 'Default Account', 'default', 'from-env', 'from-env');

CREATE TABLE contacts_new (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE,
  ig_user_id TEXT NOT NULL,
  username TEXT,
  display_name TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  score INTEGER NOT NULL DEFAULT 0,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_message_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO contacts_new (id, account_id, ig_user_id, username, display_name, tags, score, first_seen_at, last_message_at)
SELECT id, 'default', ig_user_id, username, display_name, tags, COALESCE(score, 0), first_seen_at, last_message_at FROM contacts;
DROP TABLE contacts;
ALTER TABLE contacts_new RENAME TO contacts;
CREATE INDEX IF NOT EXISTS idx_contacts_ig_user_id ON contacts(ig_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_account ON contacts(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_account_ig_user_id ON contacts(account_id, ig_user_id);

ALTER TABLE keyword_rules ADD COLUMN account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_keyword_rules_account ON keyword_rules(account_id);
ALTER TABLE comment_triggers ADD COLUMN account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_comment_triggers_account ON comment_triggers(account_id);
ALTER TABLE messages ADD COLUMN account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_messages_account ON messages(account_id);
ALTER TABLE scenarios ADD COLUMN account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_scenarios_account ON scenarios(account_id);
ALTER TABLE broadcasts ADD COLUMN account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_broadcasts_account ON broadcasts(account_id);
ALTER TABLE scoring_rules ADD COLUMN account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_scoring_rules_account ON scoring_rules(account_id);
ALTER TABLE automation_rules ADD COLUMN account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_automation_rules_account ON automation_rules(account_id);
ALTER TABLE tracked_links ADD COLUMN account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tracked_links_account ON tracked_links(account_id);
ALTER TABLE delivery_settings ADD COLUMN account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_delivery_settings_account ON delivery_settings(account_id);
ALTER TABLE webhook_endpoints ADD COLUMN account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_account ON webhook_endpoints(account_id);
ALTER TABLE conversion_goals ADD COLUMN account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_conversion_goals_account ON conversion_goals(account_id);
ALTER TABLE forms ADD COLUMN account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_forms_account ON forms(account_id);
ALTER TABLE rate_limit_tokens ADD COLUMN account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_rate_limit_tokens_account ON rate_limit_tokens(account_id);
ALTER TABLE ai_config ADD COLUMN account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_ai_config_account ON ai_config(account_id);
ALTER TABLE pending_messages ADD COLUMN account_id TEXT NOT NULL DEFAULT 'default' REFERENCES accounts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_pending_messages_account ON pending_messages(account_id);
