/**
 * KeywordMatch Service — メッセージマッチング→自動返信テキスト取得
 */
import { structuredLog } from "@slidein/shared";
import type { KeywordRule } from "./types.js";
import { KeywordRuleRepository } from "./keyword-rule-repository.js";

/** regex パターンの最大長（ReDoS 対策） */
const MAX_REGEX_LENGTH = 100;

export class KeywordMatchService {
  private readonly repo: KeywordRuleRepository;

  constructor(db: D1Database, accountId: string = 'default') {
    this.repo = new KeywordRuleRepository(db, accountId);
  }

  /** メッセージテキストにマッチするルールを検索 */
  async findMatch(messageText: string): Promise<KeywordRule | null> {
    const rules = await this.repo.findAllEnabled();

    for (const rule of rules) {
      if (this.isMatch(messageText, rule)) {
        structuredLog("info", "Keyword matched", {
          keyword: rule.keyword,
          matchType: rule.matchType,
          ruleId: rule.id,
        });
        return rule;
      }
    }

    return null;
  }

  /** ルール一覧 */
  async listAll(): Promise<KeywordRule[]> {
    return await this.repo.findAll();
  }

  /** ルール作成 */
  async create(
    keyword: string,
    matchType: "exact" | "contains" | "regex",
    responseText: string,
  ): Promise<KeywordRule> {
    // regex の場合、パターンの妥当性と長さを事前検証
    if (matchType === "regex") {
      if (keyword.length > MAX_REGEX_LENGTH) {
        throw new Error(
          `Regex pattern exceeds max length of ${MAX_REGEX_LENGTH} characters`,
        );
      }
      try {
        new RegExp(keyword, "i");
      } catch {
        throw new Error(`Invalid regex pattern: ${keyword}`);
      }
    }
    return await this.repo.create(keyword, matchType, responseText);
  }

  /** ルール削除 */
  async delete(id: string): Promise<boolean> {
    return await this.repo.delete(id);
  }

  /** パターンマッチ判定（ReDoS 対策付き） */
  isMatch(text: string, rule: KeywordRule): boolean {
    const lowerText = text.toLowerCase();
    const lowerKeyword = rule.keyword.toLowerCase();

    switch (rule.matchType) {
      case "exact":
        return lowerText === lowerKeyword;
      case "contains":
        return lowerText.includes(lowerKeyword);
      case "regex":
        // パターン長の上限チェック
        if (rule.keyword.length > MAX_REGEX_LENGTH) {
          structuredLog("warn", "Regex pattern too long, skipping", {
            ruleId: rule.id,
            length: rule.keyword.length,
          });
          return false;
        }
        try {
          const regex = new RegExp(rule.keyword, "i");
          return regex.test(text);
        } catch {
          structuredLog("warn", "Invalid regex in keyword rule", {
            ruleId: rule.id,
            keyword: rule.keyword,
          });
          return false;
        }
    }
  }
}
