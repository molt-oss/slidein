-- Migration: 0006_phase3_batch3
-- Phase 3 Batch 3: AI自動応答、MCP対応

-- AI設定
CREATE TABLE IF NOT EXISTS ai_config (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  enabled INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'anthropic' CHECK (provider IN ('anthropic', 'openai')),
  api_key_encrypted TEXT,
  model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
  system_prompt TEXT,
  knowledge_base TEXT,
  max_tokens INTEGER NOT NULL DEFAULT 500,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- デフォルト行を挿入
INSERT INTO ai_config (id, enabled, provider, model, max_tokens)
VALUES ('default', 0, 'anthropic', 'claude-sonnet-4-20250514', 500);
