/**
 * Webhook OUT ドメイン型定義
 */
import { z } from "zod";

export const WebhookEndpointSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  secret: z.string(),
  enabled: z.boolean(),
  createdAt: z.string(),
});

export type WebhookEndpoint = z.infer<typeof WebhookEndpointSchema>;

/**
 * プライベートIP / localhost をブロックする SSRF 防止バリデーション
 */
function isPublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    // localhost
    if (host === "localhost" || host === "::1" || host === "[::1]") return false;
    // プライベートIP / リンクローカル / メタデータ
    if (
      /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|169\.254\.)/.test(host)
    ) {
      return false;
    }
    // 0.0.0.0
    if (host === "0.0.0.0") return false;
    return true;
  } catch {
    return false;
  }
}

export const CreateWebhookEndpointSchema = z.object({
  url: z.string().url().max(2000).refine(isPublicUrl, {
    message: "Only public http/https URLs are allowed",
  }),
  events: z.array(z.string().min(1).max(100)).min(1).max(20),
  secret: z.string().min(8).max(256),
});

export type CreateWebhookEndpointInput = z.infer<typeof CreateWebhookEndpointSchema>;

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}
