/**
 * Automation Service — IF-THEN 自動化ルール実行
 */
import { structuredLog } from "@slidein/shared";
import { ContactService } from "../contacts/service.js";
import { ScenarioService } from "../scenarios/service.js";
import { ConversionService } from "../conversions/service.js";
import { FormService } from "../forms/service.js";
import { MessageRepository } from "../messaging/repository.js";
import { PendingMessageRepository } from "../messaging/pending-message-repository.js";
import { sendTextMessage, consumeToken } from "@slidein/meta-sdk";
import { ContactRepository } from "../contacts/repository.js";
import { AutomationRuleRepository } from "./repository.js";
import type {
  AutomationRule,
  AutomationAction,
  AutomationCondition,
  CreateAutomationRuleInput,
  UpdateAutomationRuleInput,
} from "./types.js";

interface AutomationServiceDeps {
  db: D1Database;
  accessToken: string;
  igAccountId: string;
}

interface EventContext {
  contactId: string;
  tags?: string[];
  score?: number;
  keyword?: string;
}

export class AutomationService {
  private readonly repo: AutomationRuleRepository;
  private readonly contactService: ContactService;
  private readonly contactRepo: ContactRepository;
  private readonly messageRepo: MessageRepository;
  private readonly pendingRepo: PendingMessageRepository;
  private readonly deps: AutomationServiceDeps;

  constructor(deps: AutomationServiceDeps) {
    this.deps = deps;
    this.repo = new AutomationRuleRepository(deps.db);
    this.contactService = new ContactService(deps.db);
    this.contactRepo = new ContactRepository(deps.db);
    this.messageRepo = new MessageRepository(deps.db);
    this.pendingRepo = new PendingMessageRepository(deps.db);
  }

  async listAll(): Promise<AutomationRule[]> {
    return this.repo.findAll();
  }

  async create(input: CreateAutomationRuleInput): Promise<AutomationRule> {
    const rule = await this.repo.create(
      input.name,
      input.eventType,
      input.condition ?? {},
      input.actions,
    );
    structuredLog("info", "Automation rule created", { ruleId: rule.id });
    return rule;
  }

  async update(
    id: string,
    input: UpdateAutomationRuleInput,
  ): Promise<AutomationRule | null> {
    const updated = await this.repo.update(id, {
      name: input.name,
      eventType: input.eventType,
      condition: input.condition,
      actions: input.actions,
      enabled: input.enabled,
    });
    if (updated) {
      structuredLog("info", "Automation rule updated", { ruleId: id });
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.repo.delete(id);
    if (deleted) {
      structuredLog("info", "Automation rule deleted", { ruleId: id });
    }
    return deleted;
  }

  /** イベント発生時にマッチするルールのアクションを実行 */
  async processEvent(
    eventType: string,
    context: EventContext,
  ): Promise<void> {
    const rules = await this.repo.findEnabledByEventType(eventType);

    for (const rule of rules) {
      if (!this.matchesCondition(rule.condition, context)) continue;

      structuredLog("info", "Automation rule matched", {
        ruleId: rule.id,
        ruleName: rule.name,
        eventType,
        contactId: context.contactId,
      });

      for (const action of rule.actions) {
        try {
          await this.executeAction(action, context.contactId);
        } catch (error) {
          structuredLog("error", "Automation action failed", {
            ruleId: rule.id,
            action: action.type,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  private matchesCondition(
    condition: AutomationCondition,
    context: EventContext,
  ): boolean {
    if (condition.tagEquals && context.tags) {
      if (!context.tags.includes(condition.tagEquals)) return false;
    }
    if (condition.scoreGte !== undefined && context.score !== undefined) {
      if (context.score < condition.scoreGte) return false;
    }
    if (condition.keywordContains && context.keyword) {
      if (!context.keyword.includes(condition.keywordContains)) return false;
    }
    return true;
  }

  private async executeAction(
    action: AutomationAction,
    contactId: string,
  ): Promise<void> {
    switch (action.type) {
      case "add_tag":
        if (action.tag) {
          await this.contactService.addTag(contactId, action.tag);
        }
        break;
      case "remove_tag":
        if (action.tag) {
          await this.contactService.removeTag(contactId, action.tag);
        }
        break;
      case "start_scenario":
        if (action.scenarioId) {
          const scenarioService = new ScenarioService(this.deps);
          await scenarioService.enrollContact(contactId, action.scenarioId);
        }
        break;
      case "send_message":
        if (action.messageText) {
          await this.sendMessage(contactId, action.messageText);
        }
        break;
      case "record_conversion":
        if (action.goalId) {
          const conversionService = new ConversionService(this.deps.db);
          await conversionService.recordConversion(action.goalId, contactId);
        }
        break;
      case "start_form":
        if (action.formId) {
          const formService = new FormService(this.deps);
          await formService.startForm(action.formId, contactId);
        }
        break;
      default: {
        const _exhaustive: never = action;
        structuredLog("warn", "Unknown automation action type", {
          type: (_exhaustive as AutomationAction).type,
        });
      }
    }
  }

  private async sendMessage(
    contactId: string,
    text: string,
  ): Promise<void> {
    const contact = await this.contactRepo.findById(contactId);
    if (!contact) return;

    const canSend = await consumeToken(
      { db: this.deps.db },
      `dm:${this.deps.igAccountId}`,
    );
    if (!canSend) {
      await this.pendingRepo.enqueue(contact.id, contact.igUserId, text);
      return;
    }

    try {
      const result = await sendTextMessage({
        recipientId: contact.igUserId,
        messageText: text,
        accessToken: this.deps.accessToken,
        igAccountId: this.deps.igAccountId,
      });
      await this.messageRepo.create(contact.id, "out", text, result.messageId);
    } catch (error) {
      structuredLog("error", "Failed to send automation message", {
        contactId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
