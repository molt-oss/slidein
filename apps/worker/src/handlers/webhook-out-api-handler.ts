/**
 * Webhook OUT API Handler — 外部通知エンドポイント管理
 */
import { Hono } from "hono";
import { structuredLog } from "@slidein/shared";
import type { Env } from "../config/env.js";
import { WebhookService } from "../webhooks/service.js";
import { CreateWebhookEndpointSchema } from "../webhooks/types.js";
import { bearerAuth } from "../middleware/auth.js";
import { getAccountIdFromRequest } from "../accounts/http.js";

const webhookOutApi = new Hono<{ Bindings: Env }>();

webhookOutApi.use("/api/*", bearerAuth());

webhookOutApi.get("/api/webhook-endpoints", async (c) => {
  const service = new WebhookService(c.env.DB, getAccountIdFromRequest(c));
  const endpoints = await service.listAll();
  // secret をレスポンスから除外
  const safe = endpoints.map(({ secret: _secret, ...rest }) => rest);
  return c.json({ data: safe });
});

webhookOutApi.post("/api/webhook-endpoints", async (c) => {
  const body = await c.req.json();
  const parseResult = CreateWebhookEndpointSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const service = new WebhookService(c.env.DB, getAccountIdFromRequest(c));
  const endpoint = await service.create(parseResult.data);

  // secret をレスポンスから除外（GETと同様）
  const { secret: _secret, ...safeEndpoint } = endpoint;

  structuredLog("info", "Webhook endpoint created via API", {
    endpointId: endpoint.id,
  });
  return c.json({ data: safeEndpoint }, 201);
});

webhookOutApi.delete("/api/webhook-endpoints/:id", async (c) => {
  const id = c.req.param("id");
  const service = new WebhookService(c.env.DB, getAccountIdFromRequest(c));
  const deleted = await service.delete(id);

  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }

  structuredLog("info", "Webhook endpoint deleted via API", {
    endpointId: id,
  });
  return c.json({ success: true });
});

export { webhookOutApi };
