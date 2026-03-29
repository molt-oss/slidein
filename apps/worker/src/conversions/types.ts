/**
 * Conversion ドメイン型定義
 */
import { z } from "zod";

export const ConversionGoalSchema = z.object({
  id: z.string(),
  name: z.string(),
  eventType: z.string(),
  targetValue: z.string().nullable(),
  createdAt: z.string(),
});

export type ConversionGoal = z.infer<typeof ConversionGoalSchema>;

export const CreateConversionGoalSchema = z.object({
  name: z.string().min(1).max(200),
  eventType: z.string().min(1).max(100),
  targetValue: z.string().max(500).nullable().optional(),
});

export type CreateConversionGoalInput = z.infer<typeof CreateConversionGoalSchema>;

export const ConversionSchema = z.object({
  id: z.string(),
  goalId: z.string(),
  contactId: z.string(),
  convertedAt: z.string(),
});

export type Conversion = z.infer<typeof ConversionSchema>;

export interface ConversionReport {
  goalId: string;
  goalName: string;
  totalConversions: number;
  uniqueContacts: number;
  totalContacts: number;
  cvr: number;
}
