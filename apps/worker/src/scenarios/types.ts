/**
 * Scenario ドメイン型定義
 */
import { z } from "zod";

// --- Scenario ---

export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  triggerType: z.enum(["keyword", "comment", "api"]),
  triggerValue: z.string().nullable(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

// --- ScenarioStep ---

export const ScenarioStepSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  stepOrder: z.number().int().min(1),
  messageText: z.string(),
  delaySeconds: z.number().int().min(0),
  conditionTag: z.string().nullable(),
  createdAt: z.string(),
});

export type ScenarioStep = z.infer<typeof ScenarioStepSchema>;

// --- ScenarioEnrollment ---

export const ScenarioEnrollmentSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  scenarioId: z.string(),
  currentStepOrder: z.number().int(),
  status: z.enum(["active", "completed", "cancelled"]),
  nextSendAt: z.string().nullable(),
  enrolledAt: z.string(),
  updatedAt: z.string(),
});

export type ScenarioEnrollment = z.infer<typeof ScenarioEnrollmentSchema>;

// --- シナリオ + ステップ（読み取り用） ---

export type ScenarioWithSteps = Scenario & { steps: ScenarioStep[] };

// --- API入力スキーマ ---

export const CreateScenarioStepInputSchema = z.object({
  stepOrder: z.number().int().min(1),
  messageText: z.string().min(1).max(2000),
  delaySeconds: z.number().int().min(0).default(0),
  conditionTag: z.string().max(100).nullable().optional(),
});

export type CreateScenarioStepInput = z.infer<
  typeof CreateScenarioStepInputSchema
>;

export const CreateScenarioSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  triggerType: z.enum(["keyword", "comment", "api"]),
  triggerValue: z.string().max(200).nullable().optional(),
  steps: z.array(CreateScenarioStepInputSchema).min(1).max(50),
});

export type CreateScenarioInput = z.infer<typeof CreateScenarioSchema>;

export const UpdateScenarioSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  triggerType: z.enum(["keyword", "comment", "api"]).optional(),
  triggerValue: z.string().max(200).nullable().optional(),
  enabled: z.boolean().optional(),
  steps: z.array(CreateScenarioStepInputSchema).min(1).max(50).optional(),
});

export type UpdateScenarioInput = z.infer<typeof UpdateScenarioSchema>;

export const EnrollContactSchema = z.object({
  contactId: z.string().min(1),
});

export type EnrollContactInput = z.infer<typeof EnrollContactSchema>;
