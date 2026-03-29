/**
 * Tracking Service — URL短縮 + クリック計測 + 自動タグ付け
 */
import { structuredLog } from "@slidein/shared";
import { ContactService } from "../contacts/service.js";
import { ScoringService } from "../scoring/service.js";
import { TrackedLinkRepository } from "./repository.js";
import type { TrackedLink, CreateTrackedLinkInput } from "./types.js";

interface TrackingServiceDeps {
  db: D1Database;
  accessToken: string;
  igAccountId: string;
}

export class TrackingService {
  private readonly repo: TrackedLinkRepository;
  private readonly contactService: ContactService;
  private readonly scoringService: ScoringService;
  private readonly deps: TrackingServiceDeps;

  constructor(deps: TrackingServiceDeps) {
    this.deps = deps;
    this.repo = new TrackedLinkRepository(deps.db);
    this.contactService = new ContactService(deps.db);
    this.scoringService = new ScoringService(deps.db);
  }

  async listAll(): Promise<TrackedLink[]> {
    return this.repo.findAll();
  }

  async createLink(input: CreateTrackedLinkInput): Promise<TrackedLink> {
    const link = await this.repo.create(
      input.originalUrl,
      input.contactTag,
      input.scenarioId,
    );
    structuredLog("info", "Tracked link created", {
      linkId: link.id,
      shortCode: link.shortCode,
    });
    return link;
  }

  async findByShortCode(shortCode: string): Promise<TrackedLink | null> {
    return this.repo.findByShortCode(shortCode);
  }

  /** クリック記録: タグ追加 + スコアリング + click_count++ */
  async recordClick(
    shortCode: string,
    contactId: string,
  ): Promise<TrackedLink | null> {
    const link = await this.repo.findByShortCode(shortCode);
    if (!link) return null;

    // クリック記録
    await this.repo.recordClick(link.id, contactId);
    await this.repo.incrementClickCount(link.id);

    // タグ追加
    if (link.contactTag) {
      await this.contactService.addTag(contactId, link.contactTag);
    }

    // スコアリング: link_clicked イベント
    await this.scoringService.recordEvent(contactId, "link_clicked");

    structuredLog("info", "Link click recorded", {
      linkId: link.id,
      shortCode,
      contactId,
    });

    return link;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.repo.delete(id);
    if (deleted) {
      structuredLog("info", "Tracked link deleted", { linkId: id });
    }
    return deleted;
  }
}
