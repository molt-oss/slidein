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
  constructor(private readonly db: D1Database, private readonly accountId: string = 'default') {}

  async findAllEnabled(): Promise<KeywordRule[]> {
    const result = await this.db
      .prepare("SELECT * FROM keyword_rules WHERE account_id = ? AND enabled = 1")
      .bind(this.accountId).all<KeywordRuleRow>();
    return result.results.map(rowToKeywordRule);
  }

  async findAll(): Promise<KeywordRule[]> {
    const result = await this.db
      .prepare("SELECT * FROM keyword_rules WHERE account_id = ? ORDER BY created_at DESC")
      .bind(this.accountId).all<KeywordRuleRow>();
    return result.results.map(rowToKeywordRule);
  }

  async create(
    keyword: string,
    matchType: "exact" | "contains" | "regex",
    responseText: string,
  ): Promise<KeywordRule> {
    const result = await this.db
      .prepare(
        "INSERT INTO keyword_rules (account_id, keyword, match_type, response_text) VALUES (?, ?, ?, ?) RETURNING *",
      )
      .bind(this.accountId, keyword, matchType, responseText)
      .first<KeywordRuleRow>();

    if (!result) {
      throw new Error("Failed to create keyword rule");
    }
    return rowToKeywordRule(result);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM keyword_rules WHERE id = ? AND account_id = ?")
      .bind(id, this.accountId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }
}
