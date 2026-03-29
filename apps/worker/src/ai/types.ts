/**
 * AI自動応答 ドメイン型定義
 */
import { z } from "zod";

export const AIProviderSchema = z.enum(["anthropic", "openai"]);
export type AIProvider = z.infer<typeof AIProviderSchema>;

export const AIConfigSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  provider: AIProviderSchema,
  apiKeyEncrypted: z.string().nullable(),
  model: z.string(),
  systemPrompt: z.string().nullable(),
  knowledgeBase: z.string().nullable(),
  maxTokens: z.number(),
  createdAt: z.string(),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

export const UpdateAIConfigSchema = z.object({
  enabled: z.boolean().optional(),
  provider: AIProviderSchema.optional(),
  apiKeyEncrypted: z.string().nullable().optional(),
  model: z.string().max(200).optional(),
  systemPrompt: z.string().max(10000).nullable().optional(),
  knowledgeBase: z.string().max(50000).nullable().optional(),
  maxTokens: z.number().int().min(50).max(4000).optional(),
});

export type UpdateAIConfigInput = z.infer<typeof UpdateAIConfigSchema>;
