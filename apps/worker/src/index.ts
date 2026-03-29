/**
 * slidein Worker — エントリポイント
 *
 * Hono アプリの組み立て + ルーティング設定
 */
import { Hono } from "hono";
import type { Env } from "./config/env.js";
import { webhook } from "./handlers/webhook-handler.js";
import { api } from "./handlers/api-handler.js";

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
  console.log(
    JSON.stringify({
      level: "error",
      message: "Unhandled error",
      error: err.message,
      stack: err.stack,
    }),
  );
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
