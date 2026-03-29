/**
 * Contact Service — ビジネスロジック
 */
import { structuredLog } from "@slidein/shared";
import type { Contact } from "./types.js";
import { ContactRepository } from "./repository.js";

export class ContactService {
  private readonly repo: ContactRepository;

  constructor(db: D1Database) {
    this.repo = new ContactRepository(db);
  }

  /** コンタクトを取得。存在しなければ新規作成 */
  async getOrCreate(igUserId: string): Promise<Contact> {
    const existing = await this.repo.findByIgUserId(igUserId);
    if (existing) {
      await this.repo.updateLastMessageAt(igUserId);
      return existing;
    }

    structuredLog("info", "Creating new contact", { igUserId });
    return await this.repo.create(igUserId);
  }

  /** 全コンタクト一覧 */
  async listAll(): Promise<Contact[]> {
    return await this.repo.findAll();
  }

  /** タグの追加 */
  async addTag(contactId: string, tag: string): Promise<void> {
    const contact = await this.repo.findByIgUserId(contactId);
    if (!contact) return;

    const tags = new Set(contact.tags);
    tags.add(tag);
    await this.repo.updateTags(contact.id, [...tags]);

    structuredLog("info", "Tag added", { contactId: contact.id, tag });
  }

  /** タグの削除 */
  async removeTag(contactId: string, tag: string): Promise<void> {
    const contact = await this.repo.findByIgUserId(contactId);
    if (!contact) return;

    const tags = contact.tags.filter((t) => t !== tag);
    await this.repo.updateTags(contact.id, tags);

    structuredLog("info", "Tag removed", { contactId: contact.id, tag });
  }
}
