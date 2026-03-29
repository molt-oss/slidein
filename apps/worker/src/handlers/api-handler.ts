/**
 * API Handler — 管理 API ルーティング
 */
import { Hono } from "hono";
import { structuredLog } from "@slidein/shared";
import type { Env } from "../config/env.js";
import { ContactService } from "../contacts/service.js";
import { KeywordMatchService } from "../triggers/keyword-match-service.js";
import { CommentTriggerService } from "../triggers/comment-trigger-service.js";
import {
  CreateKeywordRuleSchema,
  CreateCommentTriggerSchema,
} from "../triggers/types.js";

const api = new Hono<{ Bindings: Env }>();

// --- Contacts ---

api.get("/api/contacts", async (c) => {
  const service = new ContactService(c.env.DB);
  const contacts = await service.listAll();
  return c.json({ data: contacts });
});

// --- Keyword Rules ---

api.get("/api/keyword-rules", async (c) => {
  const service = new KeywordMatchService(c.env.DB);
  const rules = await service.listAll();
  return c.json({ data: rules });
});

api.post("/api/keyword-rules", async (c) => {
  const body = await c.req.json();
  const parseResult = CreateKeywordRuleSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const { keyword, matchType, responseText } = parseResult.data;
  const service = new KeywordMatchService(c.env.DB);
  const rule = await service.create(keyword, matchType, responseText);

  structuredLog("info", "Keyword rule created", { ruleId: rule.id });
  return c.json({ data: rule }, 201);
});

api.delete("/api/keyword-rules/:id", async (c) => {
  const id = c.req.param("id");
  const service = new KeywordMatchService(c.env.DB);
  const deleted = await service.delete(id);

  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }

  structuredLog("info", "Keyword rule deleted", { ruleId: id });
  return c.json({ success: true });
});

// --- Comment Triggers ---

api.get("/api/comment-triggers", async (c) => {
  const service = new CommentTriggerService(c.env.DB);
  const triggers = await service.listAll();
  return c.json({ data: triggers });
});

api.post("/api/comment-triggers", async (c) => {
  const body = await c.req.json();
  const parseResult = CreateCommentTriggerSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const { dmResponseText, mediaIdFilter, keywordFilter } = parseResult.data;
  const service = new CommentTriggerService(c.env.DB);
  const trigger = await service.create(
    dmResponseText,
    mediaIdFilter,
    keywordFilter,
  );

  structuredLog("info", "Comment trigger created", { triggerId: trigger.id });
  return c.json({ data: trigger }, 201);
});

api.delete("/api/comment-triggers/:id", async (c) => {
  const id = c.req.param("id");
  const service = new CommentTriggerService(c.env.DB);
  const deleted = await service.delete(id);

  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }

  structuredLog("info", "Comment trigger deleted", { triggerId: id });
  return c.json({ success: true });
});

export { api };
