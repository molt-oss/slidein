/**
 * CommentTrigger Repository — D1 CRUD
 */
import type { CommentTriggerRow } from "@slidein/db";
import type { CommentTrigger } from "./types.js";

function rowToCommentTrigger(row: CommentTriggerRow): CommentTrigger {
  return {
    id: row.id,
    mediaIdFilter: row.media_id_filter,
    keywordFilter: row.keyword_filter,
    dmResponseText: row.dm_response_text,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}

export class CommentTriggerRepository {
  constructor(private readonly db: D1Database, private readonly accountId: string = 'default') {}

  async findAllEnabled(): Promise<CommentTrigger[]> {
    const result = await this.db
      .prepare("SELECT * FROM comment_triggers WHERE account_id = ? AND enabled = 1")
      .bind(this.accountId).all<CommentTriggerRow>();
    return result.results.map(rowToCommentTrigger);
  }

  async findAll(): Promise<CommentTrigger[]> {
    const result = await this.db
      .prepare("SELECT * FROM comment_triggers WHERE account_id = ? ORDER BY created_at DESC")
      .bind(this.accountId).all<CommentTriggerRow>();
    return result.results.map(rowToCommentTrigger);
  }

  async create(
    dmResponseText: string,
    mediaIdFilter?: string | null,
    keywordFilter?: string | null,
  ): Promise<CommentTrigger> {
    const result = await this.db
      .prepare(
        "INSERT INTO comment_triggers (account_id, media_id_filter, keyword_filter, dm_response_text) VALUES (?, ?, ?, ?) RETURNING *",
      )
      .bind(this.accountId, mediaIdFilter ?? null, keywordFilter ?? null, dmResponseText)
      .first<CommentTriggerRow>();

    if (!result) {
      throw new Error("Failed to create comment trigger");
    }
    return rowToCommentTrigger(result);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM comment_triggers WHERE id = ? AND account_id = ?")
      .bind(id, this.accountId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }
}
