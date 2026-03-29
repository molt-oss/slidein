/**
 * MCP ツール定義 — 既存Serviceの薄いラッパー
 */
import type { MCPToolDefinition } from "./types.js";
import { ContactService } from "../contacts/service.js";
import { ContactRepository } from "../contacts/repository.js";
import { KeywordMatchService } from "../triggers/keyword-match-service.js";
import { CommentTriggerService } from "../triggers/comment-trigger-service.js";
import { ScenarioService } from "../scenarios/service.js";
import { BroadcastService } from "../broadcasts/service.js";
import { ScoringService } from "../scoring/service.js";
import { AutomationService } from "../automations/service.js";
import { TrackingService } from "../tracking/service.js";
import { FormService } from "../forms/service.js";
import { AIService } from "../ai/service.js";

interface MCPDeps {
  db: D1Database;
  accessToken: string;
  igAccountId: string;
  aiApiKey?: string;
}

type ToolHandler = (params: Record<string, unknown>) => Promise<unknown>;

export function getToolDefinitions(): MCPToolDefinition[] {
  return TOOL_DEFS;
}

export function createToolHandlers(deps: MCPDeps): Record<string, ToolHandler> {
  const contactService = new ContactService(deps.db);
  const contactRepo = new ContactRepository(deps.db);
  const keywordService = new KeywordMatchService(deps.db);
  const commentTriggerService = new CommentTriggerService(deps.db);
  const scenarioService = new ScenarioService(deps);
  const broadcastService = new BroadcastService(deps);
  const scoringService = new ScoringService(deps.db);
  const automationService = new AutomationService(deps);
  const trackingService = new TrackingService(deps);
  const formService = new FormService(deps);
  const aiService = new AIService({ db: deps.db, aiApiKey: deps.aiApiKey });

  return {
    contacts_list: async () => contactService.listAll(),
    contacts_get: async (p) => contactRepo.findById(p.id as string),

    keyword_rules_list: async () => keywordService.listAll(),
    keyword_rules_create: async (p) =>
      keywordService.create(
        p.keyword as string,
        p.matchType as "exact" | "contains" | "regex",
        p.responseText as string,
      ),
    keyword_rules_delete: async (p) => keywordService.delete(p.id as string),

    comment_triggers_list: async () => commentTriggerService.listAll(),
    comment_triggers_create: async (p) =>
      commentTriggerService.create(
        p.dmResponseText as string,
        (p.mediaIdFilter as string) ?? undefined,
        (p.keywordFilter as string) ?? undefined,
      ),
    comment_triggers_delete: async (p) =>
      commentTriggerService.delete(p.id as string),

    scenarios_list: async () => scenarioService.listAll(),
    scenarios_create: async (p) => scenarioService.create(p as never),
    scenarios_delete: async (p) => scenarioService.delete(p.id as string),

    broadcasts_list: async () => broadcastService.listAll(),
    broadcasts_create: async (p) => broadcastService.create(p as never),
    broadcasts_send: async (p) => broadcastService.send(p.id as string),

    scoring_rules_list: async () => scoringService.listRules(),
    scoring_rules_create: async (p) =>
      scoringService.createRule({
        eventType: p.eventType as never,
        points: p.points as number,
      }),

    automations_list: async () => automationService.listAll(),
    automations_create: async (p) => automationService.create(p as never),

    tracked_links_list: async () => trackingService.listAll(),
    tracked_links_create: async (p) => trackingService.createLink(p as never),

    forms_list: async () => formService.listForms(),
    forms_create: async (p) => formService.createForm(p as never),

    ai_config_get: async () => aiService.getConfig(),
    ai_config_update: async (p) => aiService.updateConfig(p as never),
  };
}

const TOOL_DEFS: MCPToolDefinition[] = [
  {
    name: "contacts_list",
    description: "List all contacts",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "contacts_get",
    description: "Get a contact by ID",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Contact ID" } },
      required: ["id"],
    },
  },
  {
    name: "keyword_rules_list",
    description: "List all keyword auto-reply rules",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "keyword_rules_create",
    description: "Create a keyword auto-reply rule",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "Keyword to match" },
        matchType: { type: "string", enum: ["exact", "contains", "regex"] },
        responseText: { type: "string", description: "Auto-reply text" },
      },
      required: ["keyword", "matchType", "responseText"],
    },
  },
  {
    name: "keyword_rules_delete",
    description: "Delete a keyword rule by ID",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "comment_triggers_list",
    description: "List all comment-to-DM triggers",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "comment_triggers_create",
    description: "Create a comment trigger (comment → DM)",
    inputSchema: {
      type: "object",
      properties: {
        dmResponseText: { type: "string", description: "DM text to send" },
        mediaIdFilter: { type: "string", description: "Optional media ID" },
        keywordFilter: { type: "string", description: "Optional keyword" },
      },
      required: ["dmResponseText"],
    },
  },
  {
    name: "comment_triggers_delete",
    description: "Delete a comment trigger by ID",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "scenarios_list",
    description: "List all step-DM scenarios",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "scenarios_create",
    description: "Create a scenario with steps",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        triggerType: { type: "string", enum: ["keyword", "comment", "api"] },
        triggerValue: { type: "string" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              stepOrder: { type: "number" },
              messageText: { type: "string" },
              delaySeconds: { type: "number" },
            },
          },
        },
      },
      required: ["name", "triggerType", "steps"],
    },
  },
  {
    name: "scenarios_delete",
    description: "Delete a scenario by ID",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "broadcasts_list",
    description: "List all broadcasts",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "broadcasts_create",
    description: "Create a broadcast message",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        messageText: { type: "string" },
        targetType: { type: "string", enum: ["all", "tag"] },
        targetValue: { type: "string" },
        scheduledAt: { type: "string", description: "ISO 8601 datetime" },
      },
      required: ["title", "messageText"],
    },
  },
  {
    name: "broadcasts_send",
    description: "Send a broadcast immediately",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "scoring_rules_list",
    description: "List all scoring rules",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "scoring_rules_create",
    description: "Create a scoring rule",
    inputSchema: {
      type: "object",
      properties: {
        eventType: {
          type: "string",
          enum: ["message_received", "keyword_matched", "link_clicked", "scenario_completed"],
        },
        points: { type: "number", description: "Points to add (negative to subtract)" },
      },
      required: ["eventType", "points"],
    },
  },
  {
    name: "automations_list",
    description: "List all automation rules",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "automations_create",
    description: "Create an IF-THEN automation rule",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        eventType: { type: "string" },
        condition: { type: "object" },
        actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              tag: { type: "string" },
              scenarioId: { type: "string" },
              messageText: { type: "string" },
            },
          },
        },
      },
      required: ["name", "eventType", "actions"],
    },
  },
  {
    name: "tracked_links_list",
    description: "List all tracked links",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "tracked_links_create",
    description: "Create a tracked link (URL shortener with click tracking)",
    inputSchema: {
      type: "object",
      properties: {
        originalUrl: { type: "string" },
        contactTag: { type: "string" },
        scenarioId: { type: "string" },
      },
      required: ["originalUrl"],
    },
  },
  {
    name: "forms_list",
    description: "List all DM forms",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "forms_create",
    description: "Create a DM-based form",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        fields: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              type: { type: "string", enum: ["text", "number", "email", "select"] },
              key: { type: "string" },
            },
          },
        },
        thankYouMessage: { type: "string" },
      },
      required: ["name", "fields"],
    },
  },
  {
    name: "ai_config_get",
    description: "Get AI auto-reply configuration",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ai_config_update",
    description: "Update AI auto-reply configuration",
    inputSchema: {
      type: "object",
      properties: {
        enabled: { type: "boolean" },
        provider: { type: "string", enum: ["anthropic", "openai"] },
        model: { type: "string" },
        systemPrompt: { type: "string" },
        knowledgeBase: { type: "string" },
        maxTokens: { type: "number" },
      },
    },
  },
];
