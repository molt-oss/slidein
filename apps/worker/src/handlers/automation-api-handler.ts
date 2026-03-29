/**
 * Automation API Handler — 自動化ルール管理 API ルーティング
 */
import { Hono } from "hono";
import { structuredLog } from "@slidein/shared";
import type { Env } from "../config/env.js";
import { AutomationService } from "../automations/service.js";
import {
  CreateAutomationRuleSchema,
  UpdateAutomationRuleSchema,
} from "../automations/types.js";
import { bearerAuth } from "../middleware/auth.js";

const automationApi = new Hono<{ Bindings: Env }>();

automationApi.use("/api/*", bearerAuth());

function createService(env: Env): AutomationService {
  return new AutomationService({
    db: env.DB,
    accessToken: env.META_ACCESS_TOKEN,
    igAccountId: env.IG_ACCOUNT_ID,
  });
}

automationApi.get("/api/automations", async (c) => {
  const service = createService(c.env);
  const rules = await service.listAll();
  return c.json({ data: rules });
});

automationApi.post("/api/automations", async (c) => {
  const body = await c.req.json();
  const parseResult = CreateAutomationRuleSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const service = createService(c.env);
  const rule = await service.create(parseResult.data);

  structuredLog("info", "Automation rule created via API", {
    ruleId: rule.id,
  });
  return c.json({ data: rule }, 201);
});

automationApi.put("/api/automations/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parseResult = UpdateAutomationRuleSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const service = createService(c.env);
  const updated = await service.update(id, parseResult.data);

  if (!updated) {
    return c.json({ error: "Not found" }, 404);
  }

  structuredLog("info", "Automation rule updated via API", { ruleId: id });
  return c.json({ data: updated });
});

automationApi.delete("/api/automations/:id", async (c) => {
  const id = c.req.param("id");
  const service = createService(c.env);
  const deleted = await service.delete(id);

  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }

  structuredLog("info", "Automation rule deleted via API", { ruleId: id });
  return c.json({ success: true });
});

export { automationApi };
