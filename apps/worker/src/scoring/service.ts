/**
 * Scoring Service — 行動ベースのリードスコアリング
 *
 * スコアリング「ルール」の管理は ScoringRuleRepository、
 * コンタクトの「スコア操作」は ContactRepository に委譲する。
 */
import { structuredLog } from "@slidein/shared";
import { ContactRepository } from "../contacts/repository.js";
import { ScoringRuleRepository } from "./repository.js";
import type { ScoringRule, ScoringEventType, CreateScoringRuleInput } from "./types.js";

export class ScoringService {
  private readonly repo: ScoringRuleRepository;
  private readonly contactRepo: ContactRepository;

  constructor(db: D1Database) {
    this.repo = new ScoringRuleRepository(db);
    this.contactRepo = new ContactRepository(db);
  }

  async listRules(): Promise<ScoringRule[]> {
    return this.repo.findAll();
  }

  async createRule(input: CreateScoringRuleInput): Promise<ScoringRule> {
    const rule = await this.repo.create(input.eventType, input.points);
    structuredLog("info", "Scoring rule created", { ruleId: rule.id });
    return rule;
  }

  async deleteRule(id: string): Promise<boolean> {
    const deleted = await this.repo.delete(id);
    if (deleted) {
      structuredLog("info", "Scoring rule deleted", { ruleId: id });
    }
    return deleted;
  }

  async getScore(contactId: string): Promise<number> {
    return this.contactRepo.getScore(contactId);
  }

  /** イベント発生時にルールに従いスコアを加算 */
  async recordEvent(
    contactId: string,
    eventType: ScoringEventType,
  ): Promise<void> {
    const rules = await this.repo.findEnabledByEventType(eventType);

    if (rules.length === 0) return;

    const totalPoints = rules.reduce((sum, r) => sum + r.points, 0);
    if (totalPoints === 0) return;

    await this.contactRepo.addScore(contactId, totalPoints);

    structuredLog("info", "Score updated", {
      contactId,
      eventType,
      points: totalPoints,
    });
  }
}
