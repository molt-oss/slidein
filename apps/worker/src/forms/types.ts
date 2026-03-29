/**
 * Form ドメイン型定義
 */
import { z } from "zod";

export const FormFieldSchema = z.object({
  label: z.string().min(1).max(500),
  type: z.enum(["text", "number", "email", "select"]),
  key: z.string().min(1).max(100),
});

export type FormField = z.infer<typeof FormFieldSchema>;

export const FormSchema = z.object({
  id: z.string(),
  name: z.string(),
  fields: z.array(FormFieldSchema),
  thankYouMessage: z.string(),
  createdAt: z.string(),
});

export type Form = z.infer<typeof FormSchema>;

export const CreateFormSchema = z.object({
  name: z.string().min(1).max(200),
  fields: z.array(FormFieldSchema).min(1).max(20),
  thankYouMessage: z.string().max(1000).optional().default("Thank you!"),
});

export type CreateFormInput = z.infer<typeof CreateFormSchema>;

export const FormResponseSchema = z.object({
  id: z.string(),
  formId: z.string(),
  contactId: z.string(),
  responses: z.record(z.string()),
  currentFieldIndex: z.number(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
});

export type FormResponse = z.infer<typeof FormResponseSchema>;
