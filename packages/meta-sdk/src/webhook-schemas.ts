/**
 * Meta Webhook ペイロードの Zod スキーマ定義
 */
import { z } from "zod";

/** 受信メッセージ */
export const WebhookMessageSchema = z.object({
  mid: z.string(),
  text: z.string().optional(),
});
export type WebhookMessage = z.infer<typeof WebhookMessageSchema>;

/** messaging イベント（DM） */
export const WebhookMessagingSchema = z.object({
  sender: z.object({ id: z.string() }),
  recipient: z.object({ id: z.string() }),
  timestamp: z.number(),
  message: WebhookMessageSchema.optional(),
});
export type WebhookMessaging = z.infer<typeof WebhookMessagingSchema>;

/** コメントイベント */
export const WebhookCommentSchema = z.object({
  id: z.string(),
  text: z.string(),
  from: z.object({
    id: z.string(),
    username: z.string().optional(),
  }),
  media: z.object({
    id: z.string(),
  }).optional(),
});
export type WebhookComment = z.infer<typeof WebhookCommentSchema>;

/** Webhook entry */
export const WebhookEntrySchema = z.object({
  id: z.string(),
  time: z.number(),
  messaging: z.array(WebhookMessagingSchema).optional(),
  changes: z
    .array(
      z.object({
        field: z.string(),
        value: WebhookCommentSchema,
      }),
    )
    .optional(),
});
export type WebhookEntry = z.infer<typeof WebhookEntrySchema>;

/** トップレベルペイロード */
export const WebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(WebhookEntrySchema),
});
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
