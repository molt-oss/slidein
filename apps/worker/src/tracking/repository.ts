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
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class TrackedLinkRepository {
  constructor(private readonly db: D1Database) {}

  async findAll(): Promise<TrackedLink[]> {
    const result = await this.db
      .prepare("SELECT * FROM tracked_links ORDER BY created_at DESC")
      .all<TrackedLinkRow>();
    return result.results.map(rowToTrackedLink);
  }

  async findById(id: string): Promise<TrackedLink | null> {
    const row = await this.db
      .prepare("SELECT * FROM tracked_links WHERE id = ?")
      .bind(id)
      .first<TrackedLinkRow>();
    return row ? rowToTrackedLink(row) : null;
  }

  async findByShortCode(shortCode: string): Promise<TrackedLink | null> {
    const row = await this.db
      .prepare("SELECT * FROM tracked_links WHERE short_code = ?")
      .bind(shortCode)
      .first<TrackedLinkRow>();
    return row ? rowToTrackedLink(row) : null;
  }

  async create(
    originalUrl: string,
    contactTag?: string | null,
    scenarioId?: string | null,
  ): Promise<TrackedLink> {
    const shortCode = generateShortCode();
    const row = await this.db
      .prepare(
        `INSERT INTO tracked_links (original_url, short_code, contact_tag, scenario_id)
         VALUES (?, ?, ?, ?) RETURNING *`,
      )
      .bind(originalUrl, shortCode, contactTag ?? null, scenarioId ?? null)
      .first<TrackedLinkRow>();
    if (!row) throw new Error("Failed to create tracked link");
    return rowToTrackedLink(row);
  }

  async incrementClickCount(id: string): Promise<void> {
    await this.db
      .prepare("UPDATE tracked_links SET click_count = click_count + 1 WHERE id = ?")
      .bind(id)
      .run();
  }

  async recordClick(trackedLinkId: string, contactId: string): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO link_clicks (tracked_link_id, contact_id) VALUES (?, ?)",
      )
      .bind(trackedLinkId, contactId)
      .run();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM tracked_links WHERE id = ?")
      .bind(id)
      .run();
    return result.meta.changes > 0;
  }
}
