/**
 * Triggers ドメイン型定義（Zod スキーマ強化済み）
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
  keyword: z.string().min(1).max(100, "Keyword must be 100 characters or less"),
  matchType: z.enum(["exact", "contains", "regex"]).default("contains"),
  responseText: z
    .string()
    .min(1)
    .max(2000, "Response text must be 2000 characters or less"),
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
  mediaIdFilter: z.string().max(100).nullable().optional(),
  keywordFilter: z.string().max(100).nullable().optional(),
  dmResponseText: z
    .string()
    .min(1)
    .max(2000, "DM response text must be 2000 characters or less"),
});

export type CreateCommentTriggerInput = z.infer<
  typeof CreateCommentTriggerSchema
>;
