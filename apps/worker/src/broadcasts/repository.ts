/**
 * Broadcast Repository — D1 CRUD
 */
import type { BroadcastRow } from "@slidein/db";
import type { Broadcast } from "./types.js";

function rowToBroadcast(row: BroadcastRow): Broadcast {
  return {
    id: row.id,
    title: row.title,
    messageText: row.message_text,
    targetType: row.target_type,
    targetValue: row.target_value,
    status: row.status,
    scheduledAt: row.scheduled_at,
    sentCount: row.sent_count,
    failedCount: row.failed_count,
    createdAt: row.created_at,
  };
}

export class BroadcastRepository {
  constructor(private readonly db: D1Database, private readonly accountId: string = 'default') {}

  async findAll(): Promise<Broadcast[]> {
    const result = await this.db
      .prepare("SELECT * FROM broadcasts WHERE account_id = ? ORDER BY created_at DESC")
      .bind(this.accountId)
      .all<BroadcastRow>();
    return result.results.map(rowToBroadcast);
  }

  async findById(id: string): Promise<Broadcast | null> {
    const row = await this.db
      .prepare("SELECT * FROM broadcasts WHERE id = ? AND account_id = ?")
      .bind(id, this.accountId)
      .first<BroadcastRow>();
    return row ? rowToBroadcast(row) : null;
  }

  async findScheduledReady(now: string): Promise<Broadcast[]> {
    const result = await this.db
      .prepare(
        "SELECT * FROM broadcasts WHERE status = 'scheduled' AND scheduled_at <= ? AND account_id = ?",
      )
      .bind(now, this.accountId)
      .all<BroadcastRow>();
    return result.results.map(rowToBroadcast);
  }

  async create(
    title: string,
    messageText: string,
    targetType: "all" | "tag",
    targetValue: string | null,
    scheduledAt: string | null,
  ): Promise<Broadcast> {
    const status = scheduledAt ? "scheduled" : "draft";
    const row = await this.db
      .prepare(
        `INSERT INTO broadcasts (account_id, title, message_text, target_type, target_value, status, scheduled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      )
      .bind(this.accountId, title, messageText, targetType, targetValue, status, scheduledAt)
      .first<BroadcastRow>();
    if (!row) throw new Error("Failed to create broadcast");
    return rowToBroadcast(row);
  }

  async updateStatus(
    id: string,
    status: Broadcast["status"],
  ): Promise<void> {
    await this.db
      .prepare("UPDATE broadcasts SET status = ? WHERE id = ? AND account_id = ?")
      .bind(status, id, this.accountId)
      .run();
  }

  async incrementSentCount(id: string): Promise<void> {
    await this.db
      .prepare("UPDATE broadcasts SET sent_count = sent_count + 1 WHERE id = ? AND account_id = ?")
      .bind(id, this.accountId)
      .run();
  }

  async incrementFailedCount(id: string): Promise<void> {
    await this.db
      .prepare("UPDATE broadcasts SET failed_count = failed_count + 1 WHERE id = ? AND account_id = ?")
      .bind(id, this.accountId)
      .run();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM broadcasts WHERE id = ? AND account_id = ?")
      .bind(id, this.accountId)
      .run();
    return result.meta.changes > 0;
  }
}
