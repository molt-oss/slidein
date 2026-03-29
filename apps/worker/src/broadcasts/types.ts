/**
 * Broadcast ドメイン型定義
 */
import { z } from "zod";

export const BroadcastSchema = z.object({
  id: z.string(),
  title: z.string(),
  messageText: z.string(),
  targetType: z.enum(["all", "tag"]),
  targetValue: z.string().nullable(),
  status: z.enum(["draft", "scheduled", "sending", "completed", "failed"]),
  scheduledAt: z.string().nullable(),
  sentCount: z.number(),
  failedCount: z.number(),
  createdAt: z.string(),
});

export type Broadcast = z.infer<typeof BroadcastSchema>;

export const CreateBroadcastSchema = z.object({
  title: z.string().min(1).max(200),
  messageText: z.string().min(1).max(2000),
  targetType: z.enum(["all", "tag"]).default("all"),
  targetValue: z.string().max(100).nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
});

export type CreateBroadcastInput = z.infer<typeof CreateBroadcastSchema>;
