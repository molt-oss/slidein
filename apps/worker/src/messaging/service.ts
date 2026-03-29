/**
 * Message Service — 送受信処理の統合
 * 24時間ルール + レート制限超過時のキューイング対応
 */
import { structuredLog } from "@slidein/shared";
import { sendTextMessage, consumeToken } from "@slidein/meta-sdk";
import { ContactService } from "../contacts/service.js";
import { KeywordMatchService } from "../triggers/keyword-match-service.js";
import { ScenarioTriggerService } from "../triggers/scenario-trigger-service.js";
import { ScoringService } from "../scoring/service.js";
import { AutomationService } from "../automations/service.js";
import { MessageRepository } from "./repository.js";
import { PendingMessageRepository } from "./pending-message-repository.js";
import { resolveTemplate, hasTemplateVars } from "./template-engine.js";

/** 24時間（ミリ秒） */
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface MessageServiceDeps {
  db: D1Database;
  accessToken: string;
  igAccountId: string;
}

export class MessageService {
  private readonly repo: MessageRepository;
  private readonly pendingRepo: PendingMessageRepository;
  private readonly contactService: ContactService;
  private readonly keywordMatchService: KeywordMatchService;
  private readonly scenarioTriggerService: ScenarioTriggerService;
  private readonly scoringService: ScoringService;
  private readonly automationService: AutomationService;
  private readonly deps: MessageServiceDeps;

  constructor(deps: MessageServiceDeps) {
    this.deps = deps;
    this.repo = new MessageRepository(deps.db);
    this.pendingRepo = new PendingMessageRepository(deps.db);
    this.contactService = new ContactService(deps.db);
    this.keywordMatchService = new KeywordMatchService(deps.db);
    this.scenarioTriggerService = new ScenarioTriggerService(deps);
    this.scoringService = new ScoringService(deps.db);
    this.automationService = new AutomationService(deps);
  }

  /** 受信メッセージ処理: ログ保存 + キーワードマッチ → 自動返信 */
  async handleIncoming(
    senderIgId: string,
    messageText: string,
    igMessageId: string,
  ): Promise<void> {
    // 1. コンタクト取得 or 作成
    const contact = await this.contactService.getOrCreate(senderIgId);

    // 2. 受信ログ保存
    await this.repo.create(contact.id, "in", messageText, igMessageId);

    structuredLog("info", "Incoming message processed", {
      contactId: contact.id,
      igUserId: senderIgId,
    });

    // 3. スコアリング: メッセージ受信イベント
    await this.scoringService.recordEvent(contact.id, "message_received");

    // 4. 自動化ルール: メッセージ受信イベント
    await this.automationService.processEvent("message_received", {
      contactId: contact.id,
      tags: contact.tags,
    });

    // 5. キーワードマッチ
    const matchedRule = await this.keywordMatchService.findMatch(messageText);

    // 6. シナリオトリガーチェック（キーワード）
    await this.scenarioTriggerService.checkKeywordTrigger(
      contact.id,
      messageText,
    );

    if (matchedRule) {
      // スコアリング: キーワードマッチイベント
      await this.scoringService.recordEvent(contact.id, "keyword_matched");

      // 自動化ルール: キーワードマッチイベント
      await this.automationService.processEvent("keyword_matched", {
        contactId: contact.id,
        tags: contact.tags,
        keyword: messageText,
      });
    }

    if (!matchedRule) {
      return;
    }

    // 7. テンプレート変数の解決
    let responseText = matchedRule.responseText;
    if (hasTemplateVars(responseText)) {
      const score = await this.scoringService.getScore(contact.id);
      responseText = resolveTemplate(responseText, { ...contact, score });
    }

    // 8. DM送信（24hチェック + レート制限込み）
    await this.sendDm(
      contact.id,
      senderIgId,
      responseText,
      contact.lastMessageAt,
    );
  }

  /** コメントトリガーによるDM送信 */
  async sendTriggeredDm(
    recipientIgId: string,
    responseText: string,
    triggerId: string,
    commentText?: string,
  ): Promise<void> {
    const contact = await this.contactService.getOrCreate(recipientIgId);

    structuredLog("info", "Processing triggered DM", {
      contactId: contact.id,
      triggerId,
    });

    // シナリオトリガーチェック（コメント）
    if (commentText) {
      await this.scenarioTriggerService.checkCommentTrigger(
        contact.id,
        commentText,
      );
    }

    await this.sendDm(
      contact.id,
      recipientIgId,
      responseText,
      contact.lastMessageAt,
    );
  }

  /** 未送信メッセージの再送（Cronトリガーから呼び出し） */
  async processPendingMessages(): Promise<void> {
    const pending = await this.pendingRepo.findPending(10);

    for (const msg of pending) {
      const canSend = await consumeToken(
        { db: this.deps.db },
        `dm:${this.deps.igAccountId}`,
      );
      if (!canSend) {
        structuredLog("warn", "Rate limit still exceeded for pending messages");
        break;
      }

      try {
        const result = await sendTextMessage({
          recipientId: msg.recipientIgId,
          messageText: msg.content,
          accessToken: this.deps.accessToken,
          igAccountId: this.deps.igAccountId,
        });

        await this.pendingRepo.markSent(msg.id);
        await this.repo.create(
          msg.contactId,
          "out",
          msg.content,
          result.messageId,
        );

        structuredLog("info", "Pending message sent", {
          pendingId: msg.id,
          messageId: result.messageId,
        });
      } catch (error) {
        await this.pendingRepo.markFailed(msg.id);
        structuredLog("error", "Failed to send pending message", {
          pendingId: msg.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /** DM送信の共通ロジック（24hチェック + レート制限 + キューイング） */
  private async sendDm(
    contactId: string,
    recipientIgId: string,
    text: string,
    lastMessageAt: string,
  ): Promise<void> {
    // 24時間ルールチェック
    const elapsed =
      Date.now() - new Date(lastMessageAt).getTime();
    if (elapsed > TWENTY_FOUR_HOURS_MS) {
      structuredLog("warn", "24-hour window expired, skipping DM", {
        contactId,
        lastMessageAt,
        elapsedMs: elapsed,
      });
      return;
    }

    // レート制限チェック
    const canSend = await consumeToken(
      { db: this.deps.db },
      `dm:${this.deps.igAccountId}`,
    );
    if (!canSend) {
      structuredLog("warn", "Rate limit exceeded, queuing message", {
        contactId,
      });
      await this.pendingRepo.enqueue(contactId, recipientIgId, text);
      return;
    }

    // 送信
    try {
      const result = await sendTextMessage({
        recipientId: recipientIgId,
        messageText: text,
        accessToken: this.deps.accessToken,
        igAccountId: this.deps.igAccountId,
      });

      await this.repo.create(contactId, "out", text, result.messageId);

      structuredLog("info", "DM sent", {
        contactId,
        messageId: result.messageId,
      });
    } catch (error) {
      structuredLog("error", "Failed to send DM", {
        contactId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
