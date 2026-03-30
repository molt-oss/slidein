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
import { accountApi } from "./handlers/account-api-handler.js";
import { mcpHandler } from "./handlers/mcp-handler.js";
import { MessageService } from "./messaging/service.js";
import { ScenarioService } from "./scenarios/service.js";
import { BroadcastService } from "./broadcasts/service.js";
import { AccountService } from "./accounts/service.js";

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.json({ status: "ok", service: "slidein-worker" }));

app.route("/", webhook);
app.route("/", api);
app.route("/", scenarioApi);
app.route("/", broadcastApi);
app.route("/", scoringApi);
app.route("/", automationApi);
app.route("/", trackingApi);
app.route("/", webhookOutApi);
app.route("/", conversionApi);
app.route("/", formApi);
app.route("/", deliverySettingsApi);
app.route("/", aiApi);
app.route("/", accountApi);
app.route("/", mcpHandler);

app.notFound((c) => c.json({ error: "Not found" }, 404));

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
    ctx.waitUntil(
      (async () => {
        const accountService = new AccountService(env.DB);
        const accounts = await accountService.listAll();
        const enabledAccounts = accounts.filter(
          (account) => account.enabled && account.id !== "default",
        );

        const runForAccount = async (
          accountId: string,
          accessToken: string,
          igAccountId: string,
        ) => {
          structuredLog("info", "Cron trigger: processing account", {
            accountId,
            igAccountId,
          });

          const deps = {
            db: env.DB,
            accessToken,
            igAccountId,
            accountId,
          };

          const messageService = new MessageService(deps);
          await messageService.processPendingMessages();

          const scenarioService = new ScenarioService(deps);
          await scenarioService.processReadySteps();

          const broadcastService = new BroadcastService(deps);
          await broadcastService.processScheduled();
        };

        const accountRuns = [
          runForAccount("default", env.META_ACCESS_TOKEN, env.IG_ACCOUNT_ID),
          ...enabledAccounts.map((account) =>
            runForAccount(
              account.id,
              account.metaAccessToken,
              account.igAccountId,
            )
          ),
        ];

        for (const task of accountRuns) {
          try {
            await task;
          } catch (error) {
            structuredLog("error", "Cron trigger: account processing failed", {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      })(),
    );
  },
};
