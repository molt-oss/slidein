/**
 * ScenarioTrigger Service — メッセージ/コメントからシナリオ自動登録
 */
import { structuredLog } from "@slidein/shared";
import { ScenarioRepository } from "../scenarios/scenario-repository.js";
import { ScenarioService } from "../scenarios/service.js";

interface ScenarioTriggerDeps {
  db: D1Database;
  accessToken: string;
  igAccountId: string;
  accountId?: string;
}

export class ScenarioTriggerService {
  private readonly scenarioRepo: ScenarioRepository;
  private readonly scenarioService: ScenarioService;

  constructor(deps: ScenarioTriggerDeps) {
    const accountId = deps.accountId ?? 'default';
    this.scenarioRepo = new ScenarioRepository(deps.db, accountId);
    this.scenarioService = new ScenarioService({ ...deps, accountId });
  }

  /** キーワードマッチ時にシナリオ登録を試みる */
  async checkKeywordTrigger(
    contactId: string,
    keyword: string,
  ): Promise<void> {
    const scenarios = await this.scenarioRepo.findByTrigger(
      "keyword",
      keyword,
    );
    for (const scenario of scenarios) {
      try {
        await this.scenarioService.enrollContact(contactId, scenario.id);
        structuredLog("info", "Keyword trigger enrolled contact", {
          contactId,
          scenarioId: scenario.id,
          keyword,
        });
      } catch (error) {
        structuredLog("error", "Failed to enroll via keyword trigger", {
          contactId,
          scenarioId: scenario.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /** コメントトリガー時にシナリオ登録を試みる */
  async checkCommentTrigger(
    contactId: string,
    commentText: string,
  ): Promise<void> {
    // コメントテキストをtrigger_valueとして検索
    const scenarios = await this.scenarioRepo.findByTrigger(
      "comment",
      commentText,
    );
    for (const scenario of scenarios) {
      try {
        await this.scenarioService.enrollContact(contactId, scenario.id);
        structuredLog("info", "Comment trigger enrolled contact", {
          contactId,
          scenarioId: scenario.id,
        });
      } catch (error) {
        structuredLog("error", "Failed to enroll via comment trigger", {
          contactId,
          scenarioId: scenario.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}
