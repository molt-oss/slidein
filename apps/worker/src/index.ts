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
import { scenarioApi } from "./handlers/scenario-api-handler.js";
import { broadcastApi } from "./handlers/broadcast-api-handler.js";
import { scoringApi } from "./handlers/scoring-api-handler.js";
import { automationApi } from "./handlers/automation-api-handler.js";
import { trackingApi } from "./handlers/tracking-api-handler.js";
import { webhookOutApi } from "./handlers/webhook-out-api-handler.js";
import { conversionApi } from "./handlers/conversion-api-handler.js";
import { formApi } from "./handlers/form-api-handler.js";
import { deliverySettingsApi } from "./handlers/delivery-settings-api-handler.js";
import { aiApi } from "./handlers/ai-api-handler.js";
import { mcpHandler } from "./handlers/mcp-handler.js";
import { MessageService } from "./messaging/service.js";
import { ScenarioService } from "./scenarios/service.js";
import { BroadcastService } from "./broadcasts/service.js";

const app = new Hono<{ Bindings: Env }>();

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "slidein-worker" }));

// Webhook ルート
app.route("/", webhook);

// 管理 API ルート
app.route("/", api);

// シナリオ API ルート
app.route("/", scenarioApi);

// ブロードキャスト API ルート
app.route("/", broadcastApi);

// スコアリング API ルート
app.route("/", scoringApi);

// 自動化ルール API ルート
app.route("/", automationApi);

// トラッキングリンク API + リダイレクトルート
app.route("/", trackingApi);

// Webhook OUT API ルート
app.route("/", webhookOutApi);

// CV計測 API ルート
app.route("/", conversionApi);

// フォーム API ルート
app.route("/", formApi);

// 配信時間帯設定 API ルート
app.route("/", deliverySettingsApi);

// AI設定 API ルート
app.route("/", aiApi);

// MCP エンドポイント
app.route("/", mcpHandler);

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

  /** Cron Trigger — 未送信メッセージの再送 + シナリオステップ配信 */
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    const deps = {
      db: env.DB,
      accessToken: env.META_ACCESS_TOKEN,
      igAccountId: env.IG_ACCOUNT_ID,
    };

    ctx.waitUntil(
      (async () => {
        structuredLog("info", "Cron trigger: processing pending messages");
        const messageService = new MessageService(deps);
        await messageService.processPendingMessages();

        structuredLog("info", "Cron trigger: processing scenario steps");
        const scenarioService = new ScenarioService(deps);
        await scenarioService.processReadySteps();

        structuredLog("info", "Cron trigger: processing scheduled broadcasts");
        const broadcastService = new BroadcastService(deps);
        await broadcastService.processScheduled();
      })(),
    );
  },
};
