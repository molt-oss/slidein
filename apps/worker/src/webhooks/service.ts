/**
 * Webhook Service — 外部URLへのイベント通知
 *
 * HMAC-SHA256署名付きでHTTP POSTを送信
 */
import { structuredLog } from "@slidein/shared";
import { WebhookEndpointRepository } from "./repository.js";
import type {
  WebhookEndpoint,
  WebhookPayload,
  CreateWebhookEndpointInput,
} from "./types.js";

export class WebhookService {
  private readonly repo: WebhookEndpointRepository;

  constructor(db: D1Database, accountId: string = 'default') {
    this.repo = new WebhookEndpointRepository(db, accountId);
  }

  async listAll(): Promise<WebhookEndpoint[]> {
    return this.repo.findAll();
  }

  async create(input: CreateWebhookEndpointInput): Promise<WebhookEndpoint> {
    const endpoint = await this.repo.create(
      input.url,
      input.events,
      input.secret,
    );
    structuredLog("info", "Webhook endpoint created", {
      endpointId: endpoint.id,
    });
    return endpoint;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.repo.delete(id);
    if (deleted) {
      structuredLog("info", "Webhook endpoint deleted", { endpointId: id });
    }
    return deleted;
  }

  /** イベント発生時にマッチするエンドポイントへPOST通知 */
  async notifyEvent(
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const endpoints = await this.repo.findEnabled();
    const matching = endpoints.filter((ep) => ep.events.includes(event));

    if (matching.length === 0) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const body = JSON.stringify(payload);

    const results = await Promise.allSettled(
      matching.map((ep) => this.sendWebhook(ep, body)),
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "rejected") {
        structuredLog("error", "Webhook delivery failed", {
          endpointId: matching[i].id,
          url: matching[i].url,
          error: String(result.reason),
        });
      }
    }
  }

  /** 送信先URLがプライベートIPでないことを検証（SSRF防止） */
  private isUrlSafe(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (host === "localhost" || host === "::1" || host === "[::1]" || host === "0.0.0.0") return false;
      if (/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|169\.254\.)/.test(host)) return false;
      return true;
    } catch {
      return false;
    }
  }

  private async sendWebhook(
    endpoint: WebhookEndpoint,
    body: string,
  ): Promise<void> {
    // 実行時 SSRF チェック（二重防御）
    if (!this.isUrlSafe(endpoint.url)) {
      throw new Error(`Blocked: private/internal URL ${endpoint.url}`);
    }

    const signature = await this.sign(body, endpoint.secret);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Signature-256": `sha256=${signature}`,
        },
        body,
        signal: controller.signal,
      });

      structuredLog("info", "Webhook delivered", {
        endpointId: endpoint.id,
        url: endpoint.url,
        status: response.status,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async sign(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    return Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}
