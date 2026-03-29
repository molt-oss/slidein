/**
 * Broadcast Service — 一括DM配信のビジネスロジック
 * レート制限遵守: 超過分は pending_messages にキューイング
 */
import { structuredLog } from "@slidein/shared";
import { sendTextMessage, consumeToken } from "@slidein/meta-sdk";
import { ContactRepository } from "../contacts/repository.js";
import { PendingMessageRepository } from "../messaging/pending-message-repository.js";
import { MessageRepository } from "../messaging/repository.js";
import { BroadcastRepository } from "./repository.js";
import type { Broadcast, CreateBroadcastInput } from "./types.js";

/** 24時間（ミリ秒） */
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface BroadcastServiceDeps {
  db: D1Database;
  accessToken: string;
  igAccountId: string;
}

export class BroadcastService {
  private readonly repo: BroadcastRepository;
  private readonly contactRepo: ContactRepository;
  private readonly pendingRepo: PendingMessageRepository;
  private readonly messageRepo: MessageRepository;
  private readonly deps: BroadcastServiceDeps;

  constructor(deps: BroadcastServiceDeps) {
    this.deps = deps;
    this.repo = new BroadcastRepository(deps.db);
    this.contactRepo = new ContactRepository(deps.db);
    this.pendingRepo = new PendingMessageRepository(deps.db);
    this.messageRepo = new MessageRepository(deps.db);
  }

  async listAll(): Promise<Broadcast[]> {
    return this.repo.findAll();
  }

  async create(input: CreateBroadcastInput): Promise<Broadcast> {
    const broadcast = await this.repo.create(
      input.title,
      input.messageText,
      input.targetType,
      input.targetValue ?? null,
      input.scheduledAt ?? null,
    );
    structuredLog("info", "Broadcast created", { broadcastId: broadcast.id });
    return broadcast;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.repo.delete(id);
    if (deleted) {
      structuredLog("info", "Broadcast deleted", { broadcastId: id });
    }
    return deleted;
  }

  /** 即時送信を開始 */
  async send(id: string): Promise<void> {
    const broadcast = await this.repo.findById(id);
    if (!broadcast) throw new Error("Broadcast not found");
    if (broadcast.status !== "draft" && broadcast.status !== "scheduled") {
      throw new Error(`Cannot send broadcast in status: ${broadcast.status}`);
    }
    await this.execute(broadcast);
  }

  /** 予約配信のチェック + 実行（Cronから呼び出し） */
  async processScheduled(): Promise<void> {
    const now = new Date().toISOString();
    const ready = await this.repo.findScheduledReady(now);

    for (const broadcast of ready) {
      structuredLog("info", "Executing scheduled broadcast", {
        broadcastId: broadcast.id,
      });
      await this.execute(broadcast);
    }
  }

  /** ブロードキャスト実行: 対象コンタクトにバッチ送信 */
  private async execute(broadcast: Broadcast): Promise<void> {
    await this.repo.updateStatus(broadcast.id, "sending");

    const allContacts = await this.contactRepo.findAll();
    const targets = this.filterTargets(allContacts, broadcast);

    structuredLog("info", "Broadcasting to contacts", {
      broadcastId: broadcast.id,
      targetCount: targets.length,
    });

    for (const contact of targets) {
      // 24時間ルールチェック
      const elapsed =
        Date.now() - new Date(contact.lastMessageAt).getTime();
      if (elapsed > TWENTY_FOUR_HOURS_MS) {
        await this.repo.incrementFailedCount(broadcast.id);
        continue;
      }

      // レート制限チェック
      const canSend = await consumeToken(
        { db: this.deps.db },
        `dm:${this.deps.igAccountId}`,
      );
      if (!canSend) {
        structuredLog("warn", "Rate limit exceeded, queuing broadcast message", {
          broadcastId: broadcast.id,
          contactId: contact.id,
        });
        await this.pendingRepo.enqueue(
          contact.id,
          contact.igUserId,
          broadcast.messageText,
        );
        await this.repo.incrementSentCount(broadcast.id);
        continue;
      }

      try {
        const result = await sendTextMessage({
          recipientId: contact.igUserId,
          messageText: broadcast.messageText,
          accessToken: this.deps.accessToken,
          igAccountId: this.deps.igAccountId,
        });
        await this.messageRepo.create(
          contact.id,
          "out",
          broadcast.messageText,
          result.messageId,
        );
        await this.repo.incrementSentCount(broadcast.id);
      } catch (error) {
        structuredLog("error", "Failed to send broadcast message", {
          broadcastId: broadcast.id,
          contactId: contact.id,
          error: error instanceof Error ? error.message : String(error),
        });
        await this.repo.incrementFailedCount(broadcast.id);
      }
    }

    // 全件失敗の場合は failed ステータスにする
    const updated = await this.repo.findById(broadcast.id);
    if (updated && updated.sentCount === 0 && updated.failedCount > 0) {
      await this.repo.updateStatus(broadcast.id, "failed");
      structuredLog("warn", "Broadcast failed — all messages failed", {
        broadcastId: broadcast.id,
        failedCount: updated.failedCount,
      });
    } else {
      await this.repo.updateStatus(broadcast.id, "completed");
      structuredLog("info", "Broadcast completed", {
        broadcastId: broadcast.id,
      });
    }
  }

  private filterTargets(
    contacts: Array<{ id: string; igUserId: string; tags: string[]; lastMessageAt: string }>,
    broadcast: Broadcast,
  ) {
    if (broadcast.targetType === "tag" && broadcast.targetValue) {
      return contacts.filter((c) => c.tags.includes(broadcast.targetValue!));
    }
    return contacts;
  }
}
