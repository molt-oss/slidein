/**
 * Webhook Endpoint Repository — D1 CRUD
 */
import type { WebhookEndpointRow } from "@slidein/db";
import type { WebhookEndpoint } from "./types.js";

function rowToWebhookEndpoint(row: WebhookEndpointRow): WebhookEndpoint {
  return {
    id: row.id,
    url: row.url,
    events: JSON.parse(row.events) as string[],
    secret: row.secret,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}

export class WebhookEndpointRepository {
  constructor(private readonly db: D1Database) {}

  async findAll(): Promise<WebhookEndpoint[]> {
    const result = await this.db
      .prepare("SELECT * FROM webhook_endpoints ORDER BY created_at DESC")
      .all<WebhookEndpointRow>();
    return result.results.map(rowToWebhookEndpoint);
  }

  async findEnabled(): Promise<WebhookEndpoint[]> {
    const result = await this.db
      .prepare("SELECT * FROM webhook_endpoints WHERE enabled = 1")
      .all<WebhookEndpointRow>();
    return result.results.map(rowToWebhookEndpoint);
  }

  async create(
    url: string,
    events: string[],
    secret: string,
  ): Promise<WebhookEndpoint> {
    const row = await this.db
      .prepare(
        `INSERT INTO webhook_endpoints (url, events, secret)
         VALUES (?, ?, ?) RETURNING *`,
      )
      .bind(url, JSON.stringify(events), secret)
      .first<WebhookEndpointRow>();
    if (!row) throw new Error("Failed to create webhook endpoint");
    return rowToWebhookEndpoint(row);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM webhook_endpoints WHERE id = ?")
      .bind(id)
      .run();
    return result.meta.changes > 0;
  }
}
