/**
 * Webhook Handler — Meta Webhook 検証 + 受信処理
 */
import { Hono } from "hono";
import { structuredLog } from "@slidein/shared";
import {
  verifyWebhookSignature,
  WebhookPayloadSchema,
  type WebhookPayload,
} from "@slidein/meta-sdk";
import type { Env } from "../config/env.js";
import { MessageService } from "../messaging/service.js";
import { CommentTriggerService } from "../triggers/comment-trigger-service.js";

const webhook = new Hono<{ Bindings: Env }>();

/** GET /webhook — Meta Webhook 検証 (challenge-response) */
webhook.get("/webhook", (c) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  if (mode === "subscribe" && token === c.env.META_VERIFY_TOKEN) {
    structuredLog("info", "Webhook verification successful");
    return c.text(challenge ?? "", 200);
  }

  structuredLog("warn", "Webhook verification failed", { mode, token });
  return c.text("Forbidden", 403);
});

/** POST /webhook — Meta Webhook 受信 */
webhook.post("/webhook", async (c) => {
  const signature = c.req.header("x-hub-signature-256");
  if (!signature) {
    structuredLog("warn", "Missing X-Hub-Signature-256 header");
    return c.text("Unauthorized", 401);
  }

  const rawBody = await c.req.text();

  // 署名検証
  const isValid = await verifyWebhookSignature(
    rawBody,
    signature,
    c.env.META_APP_SECRET,
  );
  if (!isValid) {
    structuredLog("warn", "Invalid webhook signature");
    return c.text("Unauthorized", 401);
  }

  // ペイロードパース
  const parseResult = WebhookPayloadSchema.safeParse(JSON.parse(rawBody));
  if (!parseResult.success) {
    structuredLog("error", "Invalid webhook payload", {
      errors: parseResult.error.flatten(),
    });
    return c.text("Bad Request", 400);
  }

  const payload = parseResult.data;

  // 5秒以内に200を返す必要があるので、処理はwaitUntilで非同期実行
  c.executionCtx.waitUntil(processWebhookPayload(c.env, payload));

  return c.text("OK", 200);
});

/** Webhook ペイロードの非同期処理（Zod スキーマ型で統一） */
async function processWebhookPayload(
  env: Env,
  payload: WebhookPayload,
): Promise<void> {
  const messageService = new MessageService({
    db: env.DB,
    accessToken: env.META_ACCESS_TOKEN,
    igAccountId: env.IG_ACCOUNT_ID,
  });

  const commentTriggerService = new CommentTriggerService(env.DB);

  for (const entry of payload.entry) {
    // DM メッセージ処理
    if (entry.messaging) {
      for (const event of entry.messaging) {
        if (event.message?.text) {
          await messageService.handleIncoming(
            event.sender.id,
            event.message.text,
            event.message.mid,
          );
        }
      }
    }

    // コメントイベント処理
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === "comments") {
          const comment = change.value;
          const trigger = await commentTriggerService.findMatch(
            comment.text,
            comment.media?.id,
          );
          if (trigger) {
            await messageService.sendTriggeredDm(
              comment.from.id,
              trigger.dmResponseText,
              trigger.id,
            );
          }
        }
      }
    }
  }
}

export { webhook };
