/**
 * KeywordRule Repository — D1 CRUD
 */
import type { KeywordRuleRow } from "@slidein/db";
import type { KeywordRule } from "./types.js";

function rowToKeywordRule(row: KeywordRuleRow): KeywordRule {
  return {
    id: row.id,
    keyword: row.keyword,
    matchType: row.match_type,
    responseText: row.response_text,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}

export class KeywordRuleRepository {
  constructor(private readonly db: D1Database) {}

  async findAllEnabled(): Promise<KeywordRule[]> {
    const result = await this.db
      .prepare("SELECT * FROM keyword_rules WHERE enabled = 1")
      .all<KeywordRuleRow>();
    return result.results.map(rowToKeywordRule);
  }

  async findAll(): Promise<KeywordRule[]> {
    const result = await this.db
      .prepare("SELECT * FROM keyword_rules ORDER BY created_at DESC")
      .all<KeywordRuleRow>();
    return result.results.map(rowToKeywordRule);
  }

  async create(
    keyword: string,
    matchType: "exact" | "contains" | "regex",
    responseText: string,
  ): Promise<KeywordRule> {
    const result = await this.db
      .prepare(
        "INSERT INTO keyword_rules (keyword, match_type, response_text) VALUES (?, ?, ?) RETURNING *",
      )
      .bind(keyword, matchType, responseText)
      .first<KeywordRuleRow>();

    if (!result) {
      throw new Error("Failed to create keyword rule");
    }
    return rowToKeywordRule(result);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM keyword_rules WHERE id = ?")
      .bind(id)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }
}
