/**
 * AI Config API Handler — AI自動応答設定 API ルーティング
 */
import { Hono } from "hono";
import { structuredLog } from "@slidein/shared";
import type { Env } from "../config/env.js";
import { AIService } from "../ai/service.js";
import { UpdateAIConfigSchema } from "../ai/types.js";
import { bearerAuth } from "../middleware/auth.js";

const aiApi = new Hono<{ Bindings: Env }>();

aiApi.use("/api/*", bearerAuth());

aiApi.get("/api/ai-config", async (c) => {
  const service = new AIService({ db: c.env.DB, aiApiKey: c.env.AI_API_KEY });
  const config = await service.getConfig();

  if (!config) {
    return c.json({ error: "AI config not found" }, 404);
  }

  // getConfig() は既にマスク済みの config を返す
  return c.json({ data: config });
});

aiApi.put("/api/ai-config", async (c) => {
  const body = await c.req.json();
  const parseResult = UpdateAIConfigSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const service = new AIService({ db: c.env.DB, aiApiKey: c.env.AI_API_KEY });
  // SF-7: updateConfig() は既にマスク済みの config を返す（repository.update がマスク済み）
  const config = await service.updateConfig(parseResult.data);

  structuredLog("info", "AI config updated via API");
  return c.json({ data: config });
});

export { aiApi };
