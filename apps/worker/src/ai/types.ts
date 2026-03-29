/**
 * AI自動応答 ドメイン型定義
 *
 * ⚠️ SECURITY NOTE:
 * apiKey フィールドはDBに平文保存される。本番環境では環境変数 AI_API_KEY を第一優先で使用すること。
 * DBにAPIキーを保存する必要がある場合は Cloudflare Workers の暗号化機能（Secrets）を検討すること。
 */
import { z } from "zod";

export const AIProviderSchema = z.enum(["anthropic", "openai"]);
export type AIProvider = z.infer<typeof AIProviderSchema>;

export const AIConfigSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  provider: AIProviderSchema,
  apiKey: z.string().nullable(),
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
  apiKey: z.string().nullable().optional(),
  model: z.string().max(200).optional(),
  systemPrompt: z.string().max(10000).nullable().optional(),
  knowledgeBase: z.string().max(50000).nullable().optional(),
  maxTokens: z.number().int().min(50).max(4000).optional(),
});

export type UpdateAIConfigInput = z.infer<typeof UpdateAIConfigSchema>;

/** APIキーをマスクして返す（例: "sk-ab...****"） */
export function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return "****";
  return `${key.slice(0, 5)}...****`;
}
