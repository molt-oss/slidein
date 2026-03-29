/**
 * Scenario API Handler — シナリオ管理 API ルーティング
 */
import { Hono } from "hono";
import { structuredLog } from "@slidein/shared";
import type { Env } from "../config/env.js";
import { ScenarioService } from "../scenarios/service.js";
import {
  CreateScenarioSchema,
  UpdateScenarioSchema,
  EnrollContactSchema,
} from "../scenarios/types.js";

const scenarioApi = new Hono<{ Bindings: Env }>();

// --- Bearer Token 認証ミドルウェア ---

scenarioApi.use("/api/*", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const expectedToken = c.env.ADMIN_API_KEY;

  if (!expectedToken) {
    structuredLog("error", "ADMIN_API_KEY is not configured");
    return c.json({ error: "Server misconfigured" }, 500);
  }

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    structuredLog("warn", "Unauthorized API request", { path: c.req.path });
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
});

function createService(env: Env): ScenarioService {
  return new ScenarioService({
    db: env.DB,
    accessToken: env.META_ACCESS_TOKEN,
    igAccountId: env.IG_ACCOUNT_ID,
  });
}

// --- Scenarios CRUD ---

scenarioApi.get("/api/scenarios", async (c) => {
  const service = createService(c.env);
  const scenarios = await service.listAll();
  return c.json({ data: scenarios });
});

scenarioApi.post("/api/scenarios", async (c) => {
  const body = await c.req.json();
  const parseResult = CreateScenarioSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const service = createService(c.env);
  const scenario = await service.create(parseResult.data);

  structuredLog("info", "Scenario created via API", {
    scenarioId: scenario.id,
  });
  return c.json({ data: scenario }, 201);
});

scenarioApi.get("/api/scenarios/:id", async (c) => {
  const id = c.req.param("id");
  const service = createService(c.env);
  const scenario = await service.getById(id);

  if (!scenario) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json({ data: scenario });
});

scenarioApi.put("/api/scenarios/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parseResult = UpdateScenarioSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const service = createService(c.env);
  const updated = await service.update(id, parseResult.data);

  if (!updated) {
    return c.json({ error: "Not found" }, 404);
  }

  structuredLog("info", "Scenario updated via API", { scenarioId: id });
  return c.json({ data: updated });
});

scenarioApi.delete("/api/scenarios/:id", async (c) => {
  const id = c.req.param("id");
  const service = createService(c.env);
  const deleted = await service.delete(id);

  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }

  structuredLog("info", "Scenario deleted via API", { scenarioId: id });
  return c.json({ success: true });
});

// --- Enrollments ---

scenarioApi.post("/api/scenarios/:id/enroll", async (c) => {
  const scenarioId = c.req.param("id");
  const body = await c.req.json();
  const parseResult = EnrollContactSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const service = createService(c.env);
  try {
    const enrollment = await service.enrollContact(
      parseResult.data.contactId,
      scenarioId,
    );
    structuredLog("info", "Contact enrolled via API", {
      scenarioId,
      contactId: parseResult.data.contactId,
    });
    return c.json({ data: enrollment }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 400);
  }
});

scenarioApi.get("/api/scenarios/:id/enrollments", async (c) => {
  const scenarioId = c.req.param("id");
  const service = createService(c.env);
  const enrollments = await service.listEnrollments(scenarioId);
  return c.json({ data: enrollments });
});

export { scenarioApi };
