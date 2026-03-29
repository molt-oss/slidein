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
  constructor(private readonly db: D1Database) {}

  async findAll(): Promise<ConversionGoal[]> {
    const result = await this.db
      .prepare("SELECT * FROM conversion_goals ORDER BY created_at DESC")
      .all<ConversionGoalRow>();
    return result.results.map(rowToGoal);
  }

  async findById(id: string): Promise<ConversionGoal | null> {
    const row = await this.db
      .prepare("SELECT * FROM conversion_goals WHERE id = ?")
      .bind(id)
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
        `INSERT INTO conversion_goals (name, event_type, target_value)
         VALUES (?, ?, ?) RETURNING *`,
      )
      .bind(name, eventType, targetValue ?? null)
      .first<ConversionGoalRow>();
    if (!row) throw new Error("Failed to create conversion goal");
    return rowToGoal(row);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM conversion_goals WHERE id = ?")
      .bind(id)
      .run();
    return result.meta.changes > 0;
  }
}

export class ConversionRepository {
  constructor(private readonly db: D1Database) {}

  async record(goalId: string, contactId: string): Promise<Conversion> {
    const row = await this.db
      .prepare(
        `INSERT INTO conversions (goal_id, contact_id)
         VALUES (?, ?) RETURNING *`,
      )
      .bind(goalId, contactId)
      .first<ConversionRow>();
    if (!row) throw new Error("Failed to record conversion");
    return rowToConversion(row);
  }

  async countByGoal(goalId: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) as cnt FROM conversions WHERE goal_id = ?")
      .bind(goalId)
      .first<{ cnt: number }>();
    return row?.cnt ?? 0;
  }

  async countUniqueContactsByGoal(goalId: string): Promise<number> {
    const row = await this.db
      .prepare(
        "SELECT COUNT(DISTINCT contact_id) as cnt FROM conversions WHERE goal_id = ?",
      )
      .bind(goalId)
      .first<{ cnt: number }>();
    return row?.cnt ?? 0;
  }
}
