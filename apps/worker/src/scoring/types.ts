/**
 * Scoring ドメイン型定義
 */
import { z } from "zod";

export const ScoringEventType = z.enum([
  "message_received",
  "keyword_matched",
  "link_clicked",
  "scenario_completed",
]);

export type ScoringEventType = z.infer<typeof ScoringEventType>;

export const ScoringRuleSchema = z.object({
  id: z.string(),
  eventType: ScoringEventType,
  points: z.number(),
  enabled: z.boolean(),
  createdAt: z.string(),
});

export type ScoringRule = z.infer<typeof ScoringRuleSchema>;

export const CreateScoringRuleSchema = z.object({
  eventType: ScoringEventType,
  points: z.number().int().min(-1000).max(1000),
});

export type CreateScoringRuleInput = z.infer<typeof CreateScoringRuleSchema>;
