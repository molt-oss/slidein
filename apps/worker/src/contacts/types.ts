/**
 * Contact ドメイン型定義
 */
import { z } from "zod";

export const ContactSchema = z.object({
  id: z.string(),
  igUserId: z.string(),
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  tags: z.array(z.string()),
  firstSeenAt: z.string(),
  lastMessageAt: z.string(),
});

export type Contact = z.infer<typeof ContactSchema>;

export const CreateContactSchema = z.object({
  igUserId: z.string().min(1),
  username: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
});

export type CreateContactInput = z.infer<typeof CreateContactSchema>;
