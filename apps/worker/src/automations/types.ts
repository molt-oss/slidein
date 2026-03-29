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
  tagEquals: z.string().optional(),
  scoreGte: z.number().optional(),
  keywordContains: z.string().optional(),
}).passthrough();

export type AutomationCondition = z.infer<typeof AutomationConditionSchema>;

export const AutomationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  eventType: z.string(),
  condition: AutomationConditionSchema,
  actions: z.array(AutomationActionSchema),
  enabled: z.boolean(),
  createdAt: z.string(),
});

export type AutomationRule = z.infer<typeof AutomationRuleSchema>;

export const CreateAutomationRuleSchema = z.object({
  name: z.string().min(1).max(200),
  eventType: z.string().min(1).max(100),
  condition: AutomationConditionSchema.optional().default({}),
  actions: z.array(AutomationActionSchema).min(1).max(10),
});

export type CreateAutomationRuleInput = z.infer<typeof CreateAutomationRuleSchema>;

export const UpdateAutomationRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  eventType: z.string().min(1).max(100).optional(),
  condition: AutomationConditionSchema.optional(),
  actions: z.array(AutomationActionSchema).min(1).max(10).optional(),
  enabled: z.boolean().optional(),
});

export type UpdateAutomationRuleInput = z.infer<typeof UpdateAutomationRuleSchema>;
