/**
 * Message Repository — D1 CRUD
 */
import type { MessageRow } from "@slidein/db";
import type { Message } from "./types.js";

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    contactId: row.contact_id,
    direction: row.direction,
    content: row.content,
    igMessageId: row.ig_message_id,
    createdAt: row.created_at,
  };
}

export class MessageRepository {
  constructor(private readonly db: D1Database, private readonly accountId: string = 'default') {}

  async create(
    contactId: string,
    direction: "in" | "out",
    content: string,
    igMessageId?: string | null,
  ): Promise<Message> {
    if (this.accountId === 'default') {
      const result = await this.db
        .prepare(
          "INSERT INTO messages (contact_id, direction, content, ig_message_id) VALUES (?, ?, ?, ?) RETURNING *",
        )
        .bind(contactId, direction, content, igMessageId ?? null)
        .first<MessageRow>();
      if (result) return rowToMessage(result);
    }

    const result = await this.db
      .prepare(
        "INSERT INTO messages (account_id, contact_id, direction, content, ig_message_id) VALUES (?, ?, ?, ?, ?) RETURNING *",
      )
      .bind(this.accountId, contactId, direction, content, igMessageId ?? null)
      .first<MessageRow>();

    if (!result) {
      throw new Error("Failed to create message");
    }
    return rowToMessage(result);
  }

  async findByContactId(contactId: string): Promise<Message[]> {
    const result = await this.db
      .prepare(
        "SELECT * FROM messages WHERE contact_id = ? AND account_id = ? ORDER BY created_at DESC",
      )
      .bind(contactId, this.accountId)
      .all<MessageRow>();
    return result.results.map(rowToMessage);
  }
}
