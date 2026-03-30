/**
 * MCP ツール定義 — 既存Serviceの薄いラッパー
 *
 * MF-2: ツールをread系/write系に分類し、scope パラメータで権限分離
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
import { AccountService } from "../accounts/service.js";

export type MCPScope = "read" | "readwrite";

interface MCPDeps {
  db: D1Database;
  accessToken: string;
  igAccountId: string;
  aiApiKey?: string;
  accountId?: string;
}

type ToolHandler = (params: Record<string, unknown>) => Promise<unknown>;

const READ_TOOLS = new Set([
  "contacts_list",
  "contacts_get",
  "keyword_rules_list",
  "comment_triggers_list",
  "scenarios_list",
  "broadcasts_list",
  "scoring_rules_list",
  "automations_list",
  "tracked_links_list",
  "forms_list",
  "ai_config_get",
  "accounts_list",
]);

const WRITE_TOOLS = new Set([
  "keyword_rules_create",
  "keyword_rules_delete",
  "comment_triggers_create",
  "comment_triggers_delete",
  "scenarios_create",
  "scenarios_delete",
  "broadcasts_create",
  "broadcasts_send",
  "scoring_rules_create",
  "automations_create",
  "tracked_links_create",
  "forms_create",
  "ai_config_update",
  "accounts_create",
  "accounts_update",
  "accounts_delete",
]);

function getAccountId(params: Record<string, unknown>, fallback = "default"): string {
  const accountId = params.accountId;
  return typeof accountId === "string" && accountId.length > 0 ? accountId : fallback;
}

function withAccountId(
  schema: MCPToolDefinition["inputSchema"],
  includeInRequired = false,
): MCPToolDefinition["inputSchema"] {
  const required = schema.required ? [...schema.required] : [];
  if (includeInRequired && !required.includes("accountId")) {
    required.push("accountId");
  }

  return {
    ...schema,
    properties: {
      ...schema.properties,
      accountId: {
        type: "string",
        description: "Target account ID",
        default: "default",
      },
    },
    ...(required.length > 0 ? { required } : {}),
  };
}

export function isWriteTool(toolName: string): boolean {
  return WRITE_TOOLS.has(toolName);
}

export function getToolDefinitions(scope: MCPScope = "readwrite"): MCPToolDefinition[] {
  if (scope === "read") {
    return TOOL_DEFS.filter((t) => READ_TOOLS.has(t.name));
  }
  return TOOL_DEFS;
}

export function createToolHandlers(deps: MCPDeps): Record<string, ToolHandler> {
  const baseAccountId = deps.accountId ?? "default";

  const buildDeps = (params: Record<string, unknown>) => ({
    ...deps,
    accountId: getAccountId(params, baseAccountId),
  });

  return {
    contacts_list: async (p) => new ContactService(deps.db, getAccountId(p, baseAccountId)).listAll(),
    contacts_get: async (p) => new ContactRepository(deps.db, getAccountId(p, baseAccountId)).findById(p.id as string),

    keyword_rules_list: async (p) => new KeywordMatchService(deps.db, getAccountId(p, baseAccountId)).listAll(),
    comment_triggers_list: async (p) => new CommentTriggerService(deps.db, getAccountId(p, baseAccountId)).listAll(),
    scenarios_list: async (p) => new ScenarioService(buildDeps(p)).listAll(),
    broadcasts_list: async (p) => new BroadcastService(buildDeps(p)).listAll(),
    scoring_rules_list: async (p) => new ScoringService(deps.db, getAccountId(p, baseAccountId)).listRules(),
    automations_list: async (p) => new AutomationService(buildDeps(p)).listAll(),
    tracked_links_list: async (p) => new TrackingService(buildDeps(p)).listAll(),
    forms_list: async (p) => new FormService(buildDeps(p)).listForms(),
    ai_config_get: async (p) => new AIService({ db: deps.db, aiApiKey: deps.aiApiKey, accountId: getAccountId(p, baseAccountId) }).getConfig(),
    accounts_list: async () => new AccountService(deps.db).listAll(true),

    keyword_rules_create: async (p) =>
      new KeywordMatchService(deps.db, getAccountId(p, baseAccountId)).create(
        p.keyword as string,
        p.matchType as "exact" | "contains" | "regex",
        p.responseText as string,
      ),
    keyword_rules_delete: async (p) => new KeywordMatchService(deps.db, getAccountId(p, baseAccountId)).delete(p.id as string),

    comment_triggers_create: async (p) =>
      new CommentTriggerService(deps.db, getAccountId(p, baseAccountId)).create(
        p.dmResponseText as string,
        (p.mediaIdFilter as string) ?? undefined,
        (p.keywordFilter as string) ?? undefined,
      ),
    comment_triggers_delete: async (p) =>
      new CommentTriggerService(deps.db, getAccountId(p, baseAccountId)).delete(p.id as string),

    scenarios_create: async (p) => new ScenarioService(buildDeps(p)).create(p as never),
    scenarios_delete: async (p) => new ScenarioService(buildDeps(p)).delete(p.id as string),

    broadcasts_create: async (p) => new BroadcastService(buildDeps(p)).create(p as never),
    broadcasts_send: async (p) => new BroadcastService(buildDeps(p)).send(p.id as string),

    scoring_rules_create: async (p) =>
      new ScoringService(deps.db, getAccountId(p, baseAccountId)).createRule({
        eventType: p.eventType as never,
        points: p.points as number,
      }),

    automations_create: async (p) => new AutomationService(buildDeps(p)).create(p as never),

    tracked_links_create: async (p) => new TrackingService(buildDeps(p)).createLink(p as never),

    forms_create: async (p) => new FormService(buildDeps(p)).createForm(p as never),

    ai_config_update: async (p) =>
      new AIService({ db: deps.db, aiApiKey: deps.aiApiKey, accountId: getAccountId(p, baseAccountId) }).updateConfig(p as never),

    accounts_create: async (p) =>
      new AccountService(deps.db).create({
        name: p.name as string,
        igAccountId: p.igAccountId as string,
        igUsername: (p.igUsername as string | undefined) ?? null,
        metaAccessToken: p.metaAccessToken as string,
        metaAppSecret: p.metaAppSecret as string,
        enabled: p.enabled as boolean | undefined,
      }),
    accounts_update: async (p) =>
      new AccountService(deps.db).update(p.id as string, {
        name: p.name as string | undefined,
        igAccountId: p.igAccountId as string | undefined,
        igUsername: (p.igUsername as string | undefined) ?? null,
        metaAccessToken: p.metaAccessToken as string | undefined,
        metaAppSecret: p.metaAppSecret as string | undefined,
        enabled: p.enabled as boolean | undefined,
      }),
    accounts_delete: async (p) => new AccountService(deps.db).delete(p.id as string),
  };
}

const TOOL_DEFS: MCPToolDefinition[] = [
  {
    name: "contacts_list",
    description: "List all contacts",
    inputSchema: withAccountId({ type: "object", properties: {} }),
  },
  {
    name: "contacts_get",
    description: "Get a contact by ID",
    inputSchema: withAccountId({
      type: "object",
      properties: { id: { type: "string", description: "Contact ID" } },
      required: ["id"],
    }),
  },
  {
    name: "keyword_rules_list",
    description: "List all keyword auto-reply rules",
    inputSchema: withAccountId({ type: "object", properties: {} }),
  },
  {
    name: "keyword_rules_create",
    description: "Create a keyword auto-reply rule",
    inputSchema: withAccountId({
      type: "object",
      properties: {
        keyword: { type: "string", description: "Keyword to match" },
        matchType: { type: "string", enum: ["exact", "contains", "regex"] },
        responseText: { type: "string", description: "Auto-reply text" },
      },
      required: ["keyword", "matchType", "responseText"],
    }),
  },
  {
    name: "keyword_rules_delete",
    description: "Delete a keyword rule by ID",
    inputSchema: withAccountId({
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    }),
  },
  {
    name: "comment_triggers_list",
    description: "List all comment-to-DM triggers",
    inputSchema: withAccountId({ type: "object", properties: {} }),
  },
  {
    name: "comment_triggers_create",
    description: "Create a comment trigger (comment → DM)",
    inputSchema: withAccountId({
      type: "object",
      properties: {
        dmResponseText: { type: "string", description: "DM text to send" },
        mediaIdFilter: { type: "string", description: "Optional media ID" },
        keywordFilter: { type: "string", description: "Optional keyword" },
      },
      required: ["dmResponseText"],
    }),
  },
  {
    name: "comment_triggers_delete",
    description: "Delete a comment trigger by ID",
    inputSchema: withAccountId({
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    }),
  },
  {
    name: "scenarios_list",
    description: "List all step-DM scenarios",
    inputSchema: withAccountId({ type: "object", properties: {} }),
  },
  {
    name: "scenarios_create",
    description: "Create a scenario with steps",
    inputSchema: withAccountId({
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
    }),
  },
  {
    name: "scenarios_delete",
    description: "Delete a scenario by ID",
    inputSchema: withAccountId({
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    }),
  },
  {
    name: "broadcasts_list",
    description: "List all broadcasts",
    inputSchema: withAccountId({ type: "object", properties: {} }),
  },
  {
    name: "broadcasts_create",
    description: "Create a broadcast message",
    inputSchema: withAccountId({
      type: "object",
      properties: {
        title: { type: "string" },
        messageText: { type: "string" },
        targetType: { type: "string", enum: ["all", "tag"] },
        targetValue: { type: "string" },
        scheduledAt: { type: "string", description: "ISO 8601 datetime" },
      },
      required: ["title", "messageText"],
    }),
  },
  {
    name: "broadcasts_send",
    description: "Send a broadcast immediately",
    inputSchema: withAccountId({
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    }),
  },
  {
    name: "scoring_rules_list",
    description: "List all scoring rules",
    inputSchema: withAccountId({ type: "object", properties: {} }),
  },
  {
    name: "scoring_rules_create",
    description: "Create a scoring rule",
    inputSchema: withAccountId({
      type: "object",
      properties: {
        eventType: {
          type: "string",
          enum: ["message_received", "keyword_matched", "link_clicked", "scenario_completed"],
        },
        points: { type: "number", description: "Points to add (negative to subtract)" },
      },
      required: ["eventType", "points"],
    }),
  },
  {
    name: "automations_list",
    description: "List all automation rules",
    inputSchema: withAccountId({ type: "object", properties: {} }),
  },
  {
    name: "automations_create",
    description: "Create an IF-THEN automation rule",
    inputSchema: withAccountId({
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
    }),
  },
  {
    name: "tracked_links_list",
    description: "List all tracked links",
    inputSchema: withAccountId({ type: "object", properties: {} }),
  },
  {
    name: "tracked_links_create",
    description: "Create a tracked link (URL shortener with click tracking)",
    inputSchema: withAccountId({
      type: "object",
      properties: {
        originalUrl: { type: "string" },
        contactTag: { type: "string" },
        scenarioId: { type: "string" },
      },
      required: ["originalUrl"],
    }),
  },
  {
    name: "forms_list",
    description: "List all DM forms",
    inputSchema: withAccountId({ type: "object", properties: {} }),
  },
  {
    name: "forms_create",
    description: "Create a DM-based form",
    inputSchema: withAccountId({
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
    }),
  },
  {
    name: "ai_config_get",
    description: "Get AI auto-reply configuration",
    inputSchema: withAccountId({ type: "object", properties: {} }),
  },
  {
    name: "ai_config_update",
    description: "Update AI auto-reply configuration",
    inputSchema: withAccountId({
      type: "object",
      properties: {
        enabled: { type: "boolean" },
        provider: { type: "string", enum: ["anthropic", "openai"] },
        model: { type: "string" },
        systemPrompt: { type: "string" },
        knowledgeBase: { type: "string" },
        maxTokens: { type: "number" },
      },
    }),
  },
  {
    name: "accounts_list",
    description: "List all accounts",
    inputSchema: withAccountId({ type: "object", properties: {} }),
  },
  {
    name: "accounts_create",
    description: "Create an account",
    inputSchema: withAccountId({
      type: "object",
      properties: {
        name: { type: "string" },
        igAccountId: { type: "string" },
        igUsername: { type: "string" },
        metaAccessToken: { type: "string" },
        metaAppSecret: { type: "string" },
        enabled: { type: "boolean" },
      },
      required: ["name", "igAccountId", "metaAccessToken", "metaAppSecret"],
    }),
  },
  {
    name: "accounts_update",
    description: "Update an account",
    inputSchema: withAccountId({
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        igAccountId: { type: "string" },
        igUsername: { type: "string" },
        metaAccessToken: { type: "string" },
        metaAppSecret: { type: "string" },
        enabled: { type: "boolean" },
      },
      required: ["id"],
    }),
  },
  {
    name: "accounts_delete",
    description: "Delete an account",
    inputSchema: withAccountId({
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    }),
  },
];
