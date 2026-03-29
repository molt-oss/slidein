/**
 * Scoring Repository — D1 CRUD
 */
import type { ScoringRuleRow } from "@slidein/db";
import type { ScoringRule, ScoringEventType } from "./types.js";

function rowToScoringRule(row: ScoringRuleRow): ScoringRule {
  return {
    id: row.id,
    eventType: row.event_type,
    points: row.points,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}

export class ScoringRuleRepository {
  constructor(private readonly db: D1Database) {}

  async findAll(): Promise<ScoringRule[]> {
    const result = await this.db
      .prepare("SELECT * FROM scoring_rules ORDER BY created_at DESC")
      .all<ScoringRuleRow>();
    return result.results.map(rowToScoringRule);
  }

  async findEnabledByEventType(eventType: ScoringEventType): Promise<ScoringRule[]> {
    const result = await this.db
      .prepare(
        "SELECT * FROM scoring_rules WHERE event_type = ? AND enabled = 1",
      )
      .bind(eventType)
      .all<ScoringRuleRow>();
    return result.results.map(rowToScoringRule);
  }

  async create(eventType: ScoringEventType, points: number): Promise<ScoringRule> {
    const row = await this.db
      .prepare(
        "INSERT INTO scoring_rules (event_type, points) VALUES (?, ?) RETURNING *",
      )
      .bind(eventType, points)
      .first<ScoringRuleRow>();
    if (!row) throw new Error("Failed to create scoring rule");
    return rowToScoringRule(row);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM scoring_rules WHERE id = ?")
      .bind(id)
      .run();
    return result.meta.changes > 0;
  }

  /** コンタクトのスコアを加算 */
  async addScore(contactId: string, points: number): Promise<void> {
    await this.db
      .prepare("UPDATE contacts SET score = score + ? WHERE id = ?")
      .bind(points, contactId)
      .run();
  }

  /** コンタクトのスコアを取得 */
  async getScore(contactId: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT score FROM contacts WHERE id = ?")
      .bind(contactId)
      .first<{ score: number }>();
    return row?.score ?? 0;
  }
}
