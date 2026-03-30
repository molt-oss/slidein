/**
 * Broadcast API Handler — ブロードキャスト管理 API ルーティング
 */
import { Hono } from "hono";
import { structuredLog } from "@slidein/shared";
import type { Env } from "../config/env.js";
import { BroadcastService } from "../broadcasts/service.js";
import { CreateBroadcastSchema } from "../broadcasts/types.js";
import { bearerAuth } from "../middleware/auth.js";
import { getAccountIdFromRequest } from "../accounts/http.js";

const broadcastApi = new Hono<{ Bindings: Env }>();

broadcastApi.use("/api/*", bearerAuth());

function createService(env: Env, accountId: string): BroadcastService {
  return new BroadcastService({
    db: env.DB,
    accessToken: env.META_ACCESS_TOKEN,
    igAccountId: env.IG_ACCOUNT_ID,
    accountId,
  });
}

broadcastApi.get("/api/broadcasts", async (c) => {
  const service = createService(c.env, getAccountIdFromRequest(c));
  const broadcasts = await service.listAll();
  return c.json({ data: broadcasts });
});

broadcastApi.post("/api/broadcasts", async (c) => {
  const body = await c.req.json();
  const parseResult = CreateBroadcastSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const service = createService(c.env, getAccountIdFromRequest(c));
  const broadcast = await service.create(parseResult.data);

  structuredLog("info", "Broadcast created via API", {
    broadcastId: broadcast.id,
  });
  return c.json({ data: broadcast }, 201);
});

broadcastApi.post("/api/broadcasts/:id/send", async (c) => {
  const id = c.req.param("id");
  const service = createService(c.env, getAccountIdFromRequest(c));

  try {
    await service.send(id);
    return c.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 400);
  }
});

broadcastApi.delete("/api/broadcasts/:id", async (c) => {
  const id = c.req.param("id");
  const service = createService(c.env, getAccountIdFromRequest(c));
  const deleted = await service.delete(id);

  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }

  structuredLog("info", "Broadcast deleted via API", { broadcastId: id });
  return c.json({ success: true });
});

export { broadcastApi };
