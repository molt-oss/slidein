/**
 * Tracking Link Repository — D1 CRUD
 */
import type { TrackedLinkRow, LinkClickRow } from "@slidein/db";
import type { TrackedLink, LinkClick } from "./types.js";

function rowToTrackedLink(row: TrackedLinkRow): TrackedLink {
  return {
    id: row.id,
    originalUrl: row.original_url,
    shortCode: row.short_code,
    contactTag: row.contact_tag,
    scenarioId: row.scenario_id,
    clickCount: row.click_count,
    createdAt: row.created_at,
  };
}

function rowToLinkClick(row: LinkClickRow): LinkClick {
  return {
    id: row.id,
    trackedLinkId: row.tracked_link_id,
    contactId: row.contact_id,
    clickedAt: row.clicked_at,
  };
}

function generateShortCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

export class TrackedLinkRepository {
  constructor(private readonly db: D1Database, private readonly accountId: string = 'default') {}

  async findAll(): Promise<TrackedLink[]> {
    const result = await this.db
      .prepare("SELECT * FROM tracked_links WHERE account_id = ? ORDER BY created_at DESC")
      .bind(this.accountId)
      .all<TrackedLinkRow>();
    return result.results.map(rowToTrackedLink);
  }

  async findById(id: string): Promise<TrackedLink | null> {
    const row = await this.db
      .prepare("SELECT * FROM tracked_links WHERE id = ? AND account_id = ?")
      .bind(id, this.accountId)
      .first<TrackedLinkRow>();
    return row ? rowToTrackedLink(row) : null;
  }

  async findByShortCode(shortCode: string): Promise<TrackedLink | null> {
    const row = await this.db
      .prepare("SELECT * FROM tracked_links WHERE short_code = ? AND account_id = ?")
      .bind(shortCode, this.accountId)
      .first<TrackedLinkRow>();
    return row ? rowToTrackedLink(row) : null;
  }

  async create(
    originalUrl: string,
    contactTag?: string | null,
    scenarioId?: string | null,
  ): Promise<TrackedLink> {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const shortCode = generateShortCode();
        const row = await this.db
          .prepare(
            `INSERT INTO tracked_links (account_id, original_url, short_code, contact_tag, scenario_id)
             VALUES (?, ?, ?, ?, ?) RETURNING *`,
          )
          .bind(this.accountId, originalUrl, shortCode, contactTag ?? null, scenarioId ?? null)
          .first<TrackedLinkRow>();
        if (!row) throw new Error("Failed to create tracked link");
        return rowToTrackedLink(row);
      } catch (error) {
        // UNIQUE制約違反の場合はリトライ
        const msg = error instanceof Error ? error.message : String(error);
        if (attempt < maxRetries - 1 && msg.includes("UNIQUE")) {
          continue;
        }
        throw error;
      }
    }
    throw new Error("Failed to generate unique short code after retries");
  }

  async incrementClickCount(id: string): Promise<void> {
    await this.db
      .prepare("UPDATE tracked_links SET click_count = click_count + 1 WHERE id = ? AND account_id = ?")
      .bind(id, this.accountId)
      .run();
  }

  async recordClick(trackedLinkId: string, contactId: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO link_clicks (tracked_link_id, contact_id)
         SELECT ?, ?
         WHERE EXISTS (SELECT 1 FROM tracked_links WHERE id = ? AND account_id = ?)`,
      )
      .bind(trackedLinkId, contactId, trackedLinkId, this.accountId)
      .run();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM tracked_links WHERE id = ? AND account_id = ?")
      .bind(id, this.accountId)
      .run();
    return result.meta.changes > 0;
  }
}
