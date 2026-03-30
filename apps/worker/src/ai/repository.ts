/**
 * AI Config Repository — D1 CRUD
 *
 * SECURITY: API key は環境変数 AI_API_KEY (Cloudflare Secret) から取得する。
 * D1 には API key を保存しない。
 * GET 系では maskApiKey() でマスクして返す。
 */
import type { AIConfigRow } from "@slidein/db";
import type { AIConfig, UpdateAIConfigInput } from "./types.js";
import { maskApiKey } from "./types.js";

function rowToAIConfig(row: AIConfigRow, envApiKey?: string): AIConfig {
  return {
    id: row.id,
    enabled: row.enabled === 1,
    provider: row.provider,
    apiKey: envApiKey ?? null, // API key comes from env, not DB
    model: row.model,
    systemPrompt: row.system_prompt,
    knowledgeBase: row.knowledge_base,
    maxTokens: row.max_tokens,
    createdAt: row.created_at,
  };
}

/** APIキーをマスクした安全なコピーを返す */
function toSafeConfig(config: AIConfig): AIConfig {
  return { ...config, apiKey: maskApiKey(config.apiKey) };
}

export class AIConfigRepository {
  constructor(
    private readonly db: D1Database,
    private readonly envApiKey?: string,
  ) {}

  /** 内部用: env API key を含む生データを返す */
  async getInternal(): Promise<AIConfig | null> {
    const row = await this.db
      .prepare("SELECT * FROM ai_config WHERE id = 'default'")
      .first<AIConfigRow>();
    return row ? rowToAIConfig(row, this.envApiKey) : null;
  }

  /** 外部公開用: APIキーをマスクして返す */
  async get(): Promise<AIConfig | null> {
    const config = await this.getInternal();
    return config ? toSafeConfig(config) : null;
  }

  async update(input: UpdateAIConfigInput): Promise<AIConfig> {
    const current = await this.getInternal();
    if (!current) {
      throw new Error("AI config not found");
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.enabled !== undefined) {
      fields.push("enabled = ?");
      values.push(input.enabled ? 1 : 0);
    }
    if (input.provider !== undefined) {
      fields.push("provider = ?");
      values.push(input.provider);
    }
    // apiKey is no longer stored in D1 — managed via env secret AI_API_KEY
    if (input.model !== undefined) {
      fields.push("model = ?");
      values.push(input.model);
    }
    if (input.systemPrompt !== undefined) {
      fields.push("system_prompt = ?");
      values.push(input.systemPrompt);
    }
    if (input.knowledgeBase !== undefined) {
      fields.push("knowledge_base = ?");
      values.push(input.knowledgeBase);
    }
    if (input.maxTokens !== undefined) {
      fields.push("max_tokens = ?");
      values.push(input.maxTokens);
    }

    if (fields.length === 0) {
      return toSafeConfig(current);
    }

    values.push("default");
    await this.db
      .prepare(
        `UPDATE ai_config SET ${fields.join(", ")} WHERE id = ?`,
      )
      .bind(...values)
      .run();

    const updated = await this.getInternal();
    if (!updated) throw new Error("Failed to update AI config");
    return toSafeConfig(updated);
  }
}
