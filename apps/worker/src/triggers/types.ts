/**
 * Triggers ドメイン型定義
 */
import { z } from "zod";

export const KeywordRuleSchema = z.object({
  id: z.string(),
  keyword: z.string(),
  matchType: z.enum(["exact", "contains", "regex"]),
  responseText: z.string(),
  enabled: z.boolean(),
  createdAt: z.string(),
});

export type KeywordRule = z.infer<typeof KeywordRuleSchema>;

export const CreateKeywordRuleSchema = z.object({
  keyword: z.string().min(1),
  matchType: z.enum(["exact", "contains", "regex"]).default("contains"),
  responseText: z.string().min(1),
});

export type CreateKeywordRuleInput = z.infer<typeof CreateKeywordRuleSchema>;

export const CommentTriggerSchema = z.object({
  id: z.string(),
  mediaIdFilter: z.string().nullable(),
  keywordFilter: z.string().nullable(),
  dmResponseText: z.string(),
  enabled: z.boolean(),
  createdAt: z.string(),
});

export type CommentTrigger = z.infer<typeof CommentTriggerSchema>;

export const CreateCommentTriggerSchema = z.object({
  mediaIdFilter: z.string().nullable().optional(),
  keywordFilter: z.string().nullable().optional(),
  dmResponseText: z.string().min(1),
});

export type CreateCommentTriggerInput = z.infer<typeof CreateCommentTriggerSchema>;
