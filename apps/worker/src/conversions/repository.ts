/**
 * Conversion Repository — D1 CRUD
 */
import type { ConversionGoalRow, ConversionRow } from "@slidein/db";
import type { ConversionGoal, Conversion } from "./types.js";

function rowToGoal(row: ConversionGoalRow): ConversionGoal {
  return {
    id: row.id,
    name: row.name,
    eventType: row.event_type,
    targetValue: row.target_value,
    createdAt: row.created_at,
  };
}

function rowToConversion(row: ConversionRow): Conversion {
  return {
    id: row.id,
    goalId: row.goal_id,
    contactId: row.contact_id,
    convertedAt: row.converted_at,
  };
}

export class ConversionGoalRepository {
  constructor(private readonly db: D1Database, private readonly accountId: string = 'default') {}

  async findAll(): Promise<ConversionGoal[]> {
    const result = await this.db
      .prepare("SELECT * FROM conversion_goals WHERE account_id = ? ORDER BY created_at DESC")
      .bind(this.accountId)
      .all<ConversionGoalRow>();
    return result.results.map(rowToGoal);
  }

  async findById(id: string): Promise<ConversionGoal | null> {
    const row = await this.db
      .prepare("SELECT * FROM conversion_goals WHERE id = ? AND account_id = ?")
      .bind(id, this.accountId)
      .first<ConversionGoalRow>();
    return row ? rowToGoal(row) : null;
  }

  async create(
    name: string,
    eventType: string,
    targetValue?: string | null,
  ): Promise<ConversionGoal> {
    const row = await this.db
      .prepare(
        `INSERT INTO conversion_goals (account_id, name, event_type, target_value)
         VALUES (?, ?, ?, ?) RETURNING *`,
      )
      .bind(this.accountId, name, eventType, targetValue ?? null)
      .first<ConversionGoalRow>();
    if (!row) throw new Error("Failed to create conversion goal");
    return rowToGoal(row);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM conversion_goals WHERE id = ? AND account_id = ?")
      .bind(id, this.accountId)
      .run();
    return result.meta.changes > 0;
  }
}

export class ConversionRepository {
  constructor(private readonly db: D1Database, private readonly accountId: string = 'default') {}

  async record(goalId: string, contactId: string): Promise<Conversion> {
    const row = await this.db
      .prepare(
        `INSERT INTO conversions (goal_id, contact_id)
         SELECT ?, ?
         WHERE EXISTS (
           SELECT 1 FROM conversion_goals WHERE id = ? AND account_id = ?
         )
         RETURNING *`,
      )
      .bind(goalId, contactId, goalId, this.accountId)
      .first<ConversionRow>();
    if (!row) throw new Error("Failed to record conversion");
    return rowToConversion(row);
  }

  async countByGoal(goalId: string): Promise<number> {
    const row = await this.db
      .prepare(
        "SELECT COUNT(*) as cnt FROM conversions c JOIN conversion_goals g ON g.id = c.goal_id WHERE c.goal_id = ? AND g.account_id = ?",
      )
      .bind(goalId, this.accountId)
      .first<{ cnt: number }>();
    return row?.cnt ?? 0;
  }

  async countUniqueContactsByGoal(goalId: string): Promise<number> {
    const row = await this.db
      .prepare(
        "SELECT COUNT(DISTINCT c.contact_id) as cnt FROM conversions c JOIN conversion_goals g ON g.id = c.goal_id WHERE c.goal_id = ? AND g.account_id = ?",
      )
      .bind(goalId, this.accountId)
      .first<{ cnt: number }>();
    return row?.cnt ?? 0;
  }
}
