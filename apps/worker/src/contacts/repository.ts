/**
 * Contact Repository — D1 CRUD
 */
import type { ContactRow } from "@slidein/db";
import type { Contact } from "./types.js";

function rowToContact(row: ContactRow): Contact {
  return {
    id: row.id,
    igUserId: row.ig_user_id,
    username: row.username,
    displayName: row.display_name,
    tags: JSON.parse(row.tags) as string[],
    score: row.score ?? 0,
    firstSeenAt: row.first_seen_at,
    lastMessageAt: row.last_message_at,
  };
}

export class ContactRepository {
  constructor(private readonly db: D1Database) {}

  async findById(id: string): Promise<Contact | null> {
    const row = await this.db
      .prepare("SELECT * FROM contacts WHERE id = ?")
      .bind(id)
      .first<ContactRow>();
    return row ? rowToContact(row) : null;
  }

  async findByIgUserId(igUserId: string): Promise<Contact | null> {
    const row = await this.db
      .prepare("SELECT * FROM contacts WHERE ig_user_id = ?")
      .bind(igUserId)
      .first<ContactRow>();
    return row ? rowToContact(row) : null;
  }

  async findAll(): Promise<Contact[]> {
    const result = await this.db
      .prepare("SELECT * FROM contacts ORDER BY last_message_at DESC")
      .all<ContactRow>();
    return result.results.map(rowToContact);
  }

  async create(
    igUserId: string,
    username?: string | null,
    displayName?: string | null,
  ): Promise<Contact> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        "INSERT INTO contacts (ig_user_id, username, display_name, first_seen_at, last_message_at) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(igUserId, username ?? null, displayName ?? null, now, now)
      .run();

    const created = await this.findByIgUserId(igUserId);
    if (!created) {
      throw new Error("Failed to create contact");
    }
    return created;
  }

  async updateLastMessageAt(igUserId: string): Promise<void> {
    await this.db
      .prepare(
        "UPDATE contacts SET last_message_at = ? WHERE ig_user_id = ?",
      )
      .bind(new Date().toISOString(), igUserId)
      .run();
  }

  async updateTags(id: string, tags: string[]): Promise<void> {
    await this.db
      .prepare("UPDATE contacts SET tags = ? WHERE id = ?")
      .bind(JSON.stringify(tags), id)
      .run();
  }
}
