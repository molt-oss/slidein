/**
 * Scoring API Handler — スコアリングルール管理 API ルーティング
 */
import { Hono } from "hono";
import { structuredLog } from "@slidein/shared";
import type { Env } from "../config/env.js";
import { ScoringService } from "../scoring/service.js";
import { CreateScoringRuleSchema } from "../scoring/types.js";
import { bearerAuth } from "../middleware/auth.js";

const scoringApi = new Hono<{ Bindings: Env }>();

scoringApi.use("/api/*", bearerAuth());

scoringApi.get("/api/scoring-rules", async (c) => {
  const service = new ScoringService(c.env.DB);
  const rules = await service.listRules();
  return c.json({ data: rules });
});

scoringApi.post("/api/scoring-rules", async (c) => {
  const body = await c.req.json();
  const parseResult = CreateScoringRuleSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const service = new ScoringService(c.env.DB);
  const rule = await service.createRule(parseResult.data);

  structuredLog("info", "Scoring rule created via API", { ruleId: rule.id });
  return c.json({ data: rule }, 201);
});

scoringApi.delete("/api/scoring-rules/:id", async (c) => {
  const id = c.req.param("id");
  const service = new ScoringService(c.env.DB);
  const deleted = await service.deleteRule(id);

  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }

  structuredLog("info", "Scoring rule deleted via API", { ruleId: id });
  return c.json({ success: true });
});

scoringApi.get("/api/contacts/:id/score", async (c) => {
  const id = c.req.param("id");
  const service = new ScoringService(c.env.DB);
  const score = await service.getScore(id);
  return c.json({ data: { contactId: id, score } });
});

export { scoringApi };
