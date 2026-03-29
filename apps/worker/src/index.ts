/**
 * slidein Worker — エントリポイント
 *
 * Hono アプリの組み立て + ルーティング設定 + Cron トリガー
 */
import { Hono } from "hono";
import { structuredLog } from "@slidein/shared";
import type { Env } from "./config/env.js";
import { webhook } from "./handlers/webhook-handler.js";
import { api } from "./handlers/api-handler.js";
import { MessageService } from "./messaging/service.js";

const app = new Hono<{ Bindings: Env }>();

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "slidein-worker" }));

// Webhook ルート
app.route("/", webhook);

// 管理 API ルート
app.route("/", api);

// 404 ハンドラ
app.notFound((c) => c.json({ error: "Not found" }, 404));

// エラーハンドラ
app.onError((err, c) => {
  structuredLog("error", "Unhandled error", {
    error: err.message,
    stack: err.stack,
    url: c.req.url,
    method: c.req.method,
  });
  return c.json({ error: "Internal server error" }, 500);
});

export default {
  fetch: app.fetch,

  /** Cron Trigger — 未送信メッセージの再送 */
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      (async () => {
        structuredLog("info", "Cron trigger: processing pending messages");
        const messageService = new MessageService({
          db: env.DB,
          accessToken: env.META_ACCESS_TOKEN,
          igAccountId: env.IG_ACCOUNT_ID,
        });
        await messageService.processPendingMessages();
      })(),
    );
  },
};
