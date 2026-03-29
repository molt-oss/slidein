/**
 * Tracking Link ドメイン型定義
 */
import { z } from "zod";

export const TrackedLinkSchema = z.object({
  id: z.string(),
  originalUrl: z.string(),
  shortCode: z.string(),
  contactTag: z.string().nullable(),
  scenarioId: z.string().nullable(),
  clickCount: z.number(),
  createdAt: z.string(),
});

export type TrackedLink = z.infer<typeof TrackedLinkSchema>;

export const CreateTrackedLinkSchema = z.object({
  originalUrl: z.string().url().max(2000).refine(
    (url) => /^https?:\/\//i.test(url),
    { message: "Only http/https URLs are allowed" },
  ),
  contactTag: z.string().max(100).nullable().optional(),
  scenarioId: z.string().nullable().optional(),
});

export type CreateTrackedLinkInput = z.infer<typeof CreateTrackedLinkSchema>;

export const LinkClickSchema = z.object({
  id: z.string(),
  trackedLinkId: z.string(),
  contactId: z.string(),
  clickedAt: z.string(),
});

export type LinkClick = z.infer<typeof LinkClickSchema>;
