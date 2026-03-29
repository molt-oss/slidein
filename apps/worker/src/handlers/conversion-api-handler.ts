/**
 * Conversion API Handler — CV計測管理
 */
import { Hono } from "hono";
import { structuredLog } from "@slidein/shared";
import type { Env } from "../config/env.js";
import { ConversionService } from "../conversions/service.js";
import { CreateConversionGoalSchema } from "../conversions/types.js";
import { bearerAuth } from "../middleware/auth.js";

const conversionApi = new Hono<{ Bindings: Env }>();

conversionApi.use("/api/*", bearerAuth());

conversionApi.get("/api/conversion-goals", async (c) => {
  const service = new ConversionService(c.env.DB);
  const goals = await service.listGoals();
  return c.json({ data: goals });
});

conversionApi.post("/api/conversion-goals", async (c) => {
  const body = await c.req.json();
  const parseResult = CreateConversionGoalSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const service = new ConversionService(c.env.DB);
  const goal = await service.createGoal(parseResult.data);

  structuredLog("info", "Conversion goal created via API", {
    goalId: goal.id,
  });
  return c.json({ data: goal }, 201);
});

conversionApi.get("/api/conversion-goals/:id/report", async (c) => {
  const id = c.req.param("id");
  const service = new ConversionService(c.env.DB);
  const report = await service.getReport(id);

  if (!report) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ data: report });
});

conversionApi.delete("/api/conversion-goals/:id", async (c) => {
  const id = c.req.param("id");
  const service = new ConversionService(c.env.DB);
  const deleted = await service.deleteGoal(id);

  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }

  structuredLog("info", "Conversion goal deleted via API", { goalId: id });
  return c.json({ success: true });
});

export { conversionApi };
