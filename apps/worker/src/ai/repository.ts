/**
 * AI Config Repository — D1 CRUD
 */
import type { AIConfigRow } from "@slidein/db";
import type { AIConfig, UpdateAIConfigInput } from "./types.js";

function rowToAIConfig(row: AIConfigRow): AIConfig {
  return {
    id: row.id,
    enabled: row.enabled === 1,
    provider: row.provider,
    apiKeyEncrypted: row.api_key_encrypted,
    model: row.model,
    systemPrompt: row.system_prompt,
    knowledgeBase: row.knowledge_base,
    maxTokens: row.max_tokens,
    createdAt: row.created_at,
  };
}

export class AIConfigRepository {
  constructor(private readonly db: D1Database) {}

  async get(): Promise<AIConfig | null> {
    const row = await this.db
      .prepare("SELECT * FROM ai_config WHERE id = 'default'")
      .first<AIConfigRow>();
    return row ? rowToAIConfig(row) : null;
  }

  async update(input: UpdateAIConfigInput): Promise<AIConfig> {
    const current = await this.get();
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
    if (input.apiKeyEncrypted !== undefined) {
      fields.push("api_key_encrypted = ?");
      values.push(input.apiKeyEncrypted);
    }
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
      return current;
    }

    values.push("default");
    await this.db
      .prepare(
        `UPDATE ai_config SET ${fields.join(", ")} WHERE id = ?`,
      )
      .bind(...values)
      .run();

    const updated = await this.get();
    if (!updated) throw new Error("Failed to update AI config");
    return updated;
  }
}
