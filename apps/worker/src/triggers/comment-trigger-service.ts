/**
 * CommentTrigger Service — コメント検知→DM応答テキスト取得
 */
import { structuredLog } from "@slidein/shared";
import type { CommentTrigger } from "./types.js";
import { CommentTriggerRepository } from "./comment-trigger-repository.js";

export class CommentTriggerService {
  private readonly repo: CommentTriggerRepository;

  constructor(db: D1Database, accountId: string = 'default') {
    this.repo = new CommentTriggerRepository(db, accountId);
  }

  /** コメントイベントにマッチするトリガーを検索 */
  async findMatch(
    commentText: string,
    mediaId?: string,
  ): Promise<CommentTrigger | null> {
    const triggers = await this.repo.findAllEnabled();

    for (const trigger of triggers) {
      if (this.isMatch(commentText, mediaId, trigger)) {
        structuredLog("info", "Comment trigger matched", {
          triggerId: trigger.id,
          mediaId,
        });
        return trigger;
      }
    }

    return null;
  }

  /** トリガー一覧 */
  async listAll(): Promise<CommentTrigger[]> {
    return await this.repo.findAll();
  }

  /** トリガー作成 */
  async create(
    dmResponseText: string,
    mediaIdFilter?: string | null,
    keywordFilter?: string | null,
  ): Promise<CommentTrigger> {
    return await this.repo.create(dmResponseText, mediaIdFilter, keywordFilter);
  }

  /** トリガー削除 */
  async delete(id: string): Promise<boolean> {
    return await this.repo.delete(id);
  }

  private isMatch(
    commentText: string,
    mediaId: string | undefined,
    trigger: CommentTrigger,
  ): boolean {
    // メディアIDフィルター
    if (trigger.mediaIdFilter && mediaId !== trigger.mediaIdFilter) {
      return false;
    }

    // キーワードフィルター
    if (trigger.keywordFilter) {
      return commentText
        .toLowerCase()
        .includes(trigger.keywordFilter.toLowerCase());
    }

    // フィルターなし = 全コメントにマッチ
    return true;
  }
}
