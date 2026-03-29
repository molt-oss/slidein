/**
 * Automation Rule ドメイン型定義
 */
import { z } from "zod";

export const AutomationActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("add_tag"), tag: z.string() }),
  z.object({ type: z.literal("remove_tag"), tag: z.string() }),
  z.object({ type: z.literal("start_scenario"), scenarioId: z.string() }),
  z.object({ type: z.literal("send_message"), messageText: z.string() }),
]);

export type AutomationAction = z.infer<typeof AutomationActionSchema>;

export const AutomationConditionSchema = z.object({
  tagEquals: z.string().max(100).optional(),
  scoreGte: z.number().int().optional(),
  keywordContains: z.string().max(500).optional(),
}).strict();

export type AutomationCondition = z.infer<typeof AutomationConditionSchema>;

/** 自動化ルールで使用可能なイベントタイプ */
export const AutomationEventType = z.enum([
  "message_received",
  "keyword_matched",
  "scenario_completed",
  "score_reached",
  "tag_added",
]);
export type AutomationEventType = z.infer<typeof AutomationEventType>;

export const AutomationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  eventType: AutomationEventType,
  condition: AutomationConditionSchema,
  actions: z.array(AutomationActionSchema),
  enabled: z.boolean(),
  createdAt: z.string(),
});

export type AutomationRule = z.infer<typeof AutomationRuleSchema>;

export const CreateAutomationRuleSchema = z.object({
  name: z.string().min(1).max(200),
  eventType: AutomationEventType,
  condition: AutomationConditionSchema.optional().default({}),
  actions: z.array(AutomationActionSchema).min(1).max(10),
});

export type CreateAutomationRuleInput = z.infer<typeof CreateAutomationRuleSchema>;

export const UpdateAutomationRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  eventType: AutomationEventType.optional(),
  condition: AutomationConditionSchema.optional(),
  actions: z.array(AutomationActionSchema).min(1).max(10).optional(),
  enabled: z.boolean().optional(),
});

export type UpdateAutomationRuleInput = z.infer<typeof UpdateAutomationRuleSchema>;
