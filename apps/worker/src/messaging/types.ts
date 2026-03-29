/**
 * Message ドメイン型定義
 */
import { z } from "zod";

export const MessageSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  direction: z.enum(["in", "out"]),
  content: z.string(),
  igMessageId: z.string().nullable(),
  createdAt: z.string(),
});

export type Message = z.infer<typeof MessageSchema>;
