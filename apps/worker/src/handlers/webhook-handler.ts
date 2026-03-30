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
import { AccountService } from "../accounts/service.js";
import type { AccountCredentials } from "../accounts/types.js";

const webhook = new Hono<{ Bindings: Env }>();

function extractRecipientIgAccountId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const entry = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entry)) return undefined;

  for (const item of entry) {
    if (!item || typeof item !== "object") continue;
    const messaging = (item as { messaging?: unknown }).messaging;
    if (!Array.isArray(messaging)) continue;

    for (const event of messaging) {
      if (!event || typeof event !== "object") continue;
      const recipient = (event as { recipient?: unknown }).recipient;
      if (!recipient || typeof recipient !== "object") continue;
      const id = (recipient as { id?: unknown }).id;
      if (typeof id === "string" && id.length > 0) return id;
    }
  }

  return undefined;
}

/** GET /webhook — Meta Webhook 検証 (challenge-response) */
webhook.get("/webhook", (c) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  if (mode === "subscribe" && token === c.env.META_VERIFY_TOKEN) {
    structuredLog("info", "Webhook verification successful");
    return c.text(challenge ?? "", 200);
  }

  structuredLog("warn", "Webhook verification failed", { mode });
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

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    structuredLog("error", "Webhook body is not valid JSON", {
      bodyLength: rawBody.length,
    });
    return c.text("Bad Request", 400);
  }

  const accountService = new AccountService(c.env.DB);
  const recipientIgAccountId = extractRecipientIgAccountId(parsed);
  const credentials = await accountService.resolveByRecipientIgAccountId(
    recipientIgAccountId,
    c.env,
  );

  const isValid = await verifyWebhookSignature(
    rawBody,
    signature,
    credentials.appSecret,
  );
  if (!isValid) {
    structuredLog("warn", "Invalid webhook signature", {
      recipientIgAccountId,
      accountId: credentials.accountId,
    });
    return c.text("Unauthorized", 401);
  }

  structuredLog("info", "Webhook payload received", {
    objectType: (parsed as Record<string, unknown>).object,
    entryCount: Array.isArray((parsed as Record<string, unknown>).entry)
      ? ((parsed as Record<string, unknown>).entry as unknown[]).length
      : 0,
    recipientIgAccountId,
    accountId: credentials.accountId,
  });

  const parseResult = WebhookPayloadSchema.safeParse(parsed);
  if (!parseResult.success) {
    structuredLog("error", "Invalid webhook payload", {
      errors: parseResult.error.flatten(),
      rawKeys: Object.keys(parsed as Record<string, unknown>),
    });
    return c.text("Bad Request", 400);
  }

  const payload = parseResult.data;

  c.executionCtx.waitUntil(processWebhookPayload(c.env, payload, credentials));

  return c.text("OK", 200);
});

/** Webhook ペイロードの非同期処理（Zod スキーマ型で統一） */
async function processWebhookPayload(
  env: Env,
  payload: WebhookPayload,
  credentials: AccountCredentials,
): Promise<void> {
  const messageService = new MessageService({
    db: env.DB,
    accessToken: credentials.accessToken,
    igAccountId: credentials.igAccountId,
    aiApiKey: env.AI_API_KEY,
    accountId: credentials.accountId,
  });

  const commentTriggerService = new CommentTriggerService(
    env.DB,
    credentials.accountId,
  );

  for (const entry of payload.entry) {
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
              comment.text,
            );
          }
        }
      }
    }
  }
}

export { webhook };
