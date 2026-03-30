/**
 * Tracking API Handler — トラッキングリンク管理 + リダイレクトルート
 */
import { Hono } from "hono";
import { structuredLog } from "@slidein/shared";
import type { Env } from "../config/env.js";
import { TrackingService } from "../tracking/service.js";
import { CreateTrackedLinkSchema } from "../tracking/types.js";
import { bearerAuth } from "../middleware/auth.js";
import { getAccountIdFromRequest } from "../accounts/http.js";

const trackingApi = new Hono<{ Bindings: Env }>();

function createService(env: Env, accountId: string): TrackingService {
  return new TrackingService({
    db: env.DB,
    accessToken: env.META_ACCESS_TOKEN,
    igAccountId: env.IG_ACCOUNT_ID,
    accountId,
  });
}

// --- Public: リダイレクトルート ---
trackingApi.get("/t/:shortCode", async (c) => {
  const shortCode = c.req.param("shortCode");
  const contactId = c.req.query("cid");
  const service = createService(c.env, getAccountIdFromRequest(c));

  const link = await service.findByShortCode(shortCode);
  if (!link) {
    return c.json({ error: "Link not found" }, 404);
  }

  // オープンリダイレクト防止: http/https スキームのみ許可
  if (!/^https?:\/\//i.test(link.originalUrl)) {
    return c.json({ error: "Invalid redirect URL" }, 400);
  }

  // クリック記録（contact_idがある場合のみ）
  if (contactId) {
    try {
      await service.recordClick(shortCode, contactId);
    } catch (error) {
      structuredLog("error", "Failed to record click", {
        shortCode,
        contactId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return c.redirect(link.originalUrl, 302);
});

// --- Protected: 管理API ---
trackingApi.use("/api/*", bearerAuth());

trackingApi.get("/api/tracked-links", async (c) => {
  const service = createService(c.env, getAccountIdFromRequest(c));
  const links = await service.listAll();
  return c.json({ data: links });
});

trackingApi.post("/api/tracked-links", async (c) => {
  const body = await c.req.json();
  const parseResult = CreateTrackedLinkSchema.safeParse(body);

  if (!parseResult.success) {
    return c.json({ error: parseResult.error.flatten() }, 400);
  }

  const service = createService(c.env, getAccountIdFromRequest(c));
  const link = await service.createLink(parseResult.data);

  structuredLog("info", "Tracked link created via API", {
    linkId: link.id,
  });
  return c.json({ data: link }, 201);
});

trackingApi.delete("/api/tracked-links/:id", async (c) => {
  const id = c.req.param("id");
  const service = createService(c.env, getAccountIdFromRequest(c));
  const deleted = await service.delete(id);

  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }

  structuredLog("info", "Tracked link deleted via API", { linkId: id });
  return c.json({ success: true });
});

export { trackingApi };
