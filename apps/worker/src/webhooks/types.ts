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

export const CreateWebhookEndpointSchema = z.object({
  url: z.string().url().max(2000),
  events: z.array(z.string().min(1).max(100)).min(1).max(20),
  secret: z.string().min(8).max(256),
});

export type CreateWebhookEndpointInput = z.infer<typeof CreateWebhookEndpointSchema>;

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}
