/**
 * Message Service — 送受信処理の統合
 */
import { structuredLog } from "@slidein/shared";
import { sendTextMessage, consumeToken } from "@slidein/meta-sdk";
import { ContactService } from "../contacts/service.js";
import { KeywordMatchService } from "../triggers/keyword-match-service.js";
import { MessageRepository } from "./repository.js";

interface MessageServiceDeps {
  db: D1Database;
  accessToken: string;
  igAccountId: string;
}

export class MessageService {
  private readonly repo: MessageRepository;
  private readonly contactService: ContactService;
  private readonly keywordMatchService: KeywordMatchService;
  private readonly deps: MessageServiceDeps;

  constructor(deps: MessageServiceDeps) {
    this.deps = deps;
    this.repo = new MessageRepository(deps.db);
    this.contactService = new ContactService(deps.db);
    this.keywordMatchService = new KeywordMatchService(deps.db);
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

    // 3. キーワードマッチ
    const matchedRule = await this.keywordMatchService.findMatch(messageText);
    if (!matchedRule) {
      return;
    }

    // 4. レート制限チェック
    const canSend = await consumeToken(
      { db: this.deps.db },
      `dm:${this.deps.igAccountId}`,
    );
    if (!canSend) {
      structuredLog("warn", "Rate limit exceeded, skipping auto-reply", {
        contactId: contact.id,
      });
      return;
    }

    // 5. 自動返信
    try {
      const result = await sendTextMessage({
        recipientId: senderIgId,
        messageText: matchedRule.responseText,
        accessToken: this.deps.accessToken,
        igAccountId: this.deps.igAccountId,
      });

      // 6. 送信ログ保存
      await this.repo.create(
        contact.id,
        "out",
        matchedRule.responseText,
        result.messageId,
      );

      structuredLog("info", "Auto-reply sent", {
        contactId: contact.id,
        ruleId: matchedRule.id,
        messageId: result.messageId,
      });
    } catch (error) {
      structuredLog("error", "Failed to send auto-reply", {
        contactId: contact.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** コメントトリガーによるDM送信 */
  async sendTriggeredDm(
    recipientIgId: string,
    responseText: string,
    triggerId: string,
  ): Promise<void> {
    const contact = await this.contactService.getOrCreate(recipientIgId);

    const canSend = await consumeToken(
      { db: this.deps.db },
      `dm:${this.deps.igAccountId}`,
    );
    if (!canSend) {
      structuredLog("warn", "Rate limit exceeded for triggered DM", {
        contactId: contact.id,
        triggerId,
      });
      return;
    }

    try {
      const result = await sendTextMessage({
        recipientId: recipientIgId,
        messageText: responseText,
        accessToken: this.deps.accessToken,
        igAccountId: this.deps.igAccountId,
      });

      await this.repo.create(
        contact.id,
        "out",
        responseText,
        result.messageId,
      );

      structuredLog("info", "Triggered DM sent", {
        contactId: contact.id,
        triggerId,
        messageId: result.messageId,
      });
    } catch (error) {
      structuredLog("error", "Failed to send triggered DM", {
        contactId: contact.id,
        triggerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
