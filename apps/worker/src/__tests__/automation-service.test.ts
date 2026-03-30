/**
 * AutomationService テスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@slidein/meta-sdk", async () => {
  const actual =
    await vi.importActual<typeof import("@slidein/meta-sdk")>(
      "@slidein/meta-sdk",
    );
  return {
    ...actual,
    sendTextMessage: vi.fn().mockResolvedValue({
      recipientId: "user-123",
      messageId: "msg-out-1",
    }),
    consumeToken: vi.fn().mockResolvedValue(true),
  };
});

import { AutomationService } from "../automations/service.js";

function createAutomationD1Mock() {
  const automationRules: Array<Record<string, unknown>> = [];
  const contacts = new Map<string, Record<string, unknown>>();
  let idCounter = 0;

  function createStatement(sql: string) {
    let boundArgs: unknown[] = [];
    return {
      bind(...args: unknown[]) {
        boundArgs = args;
        return this;
      },
      async first<T>(): Promise<T | null> {
        // INSERT automation_rules RETURNING
        if (sql.includes("INTO automation_rules") && sql.includes("RETURNING")) {
          idCounter++;
          const row = {
            id: `ar-${idCounter}`,
            account_id: boundArgs[0],
            name: boundArgs[1],
            event_type: boundArgs[2],
            condition_json: boundArgs[3],
            actions_json: boundArgs[4],
            enabled: 1,
            created_at: new Date().toISOString(),
          };
          automationRules.push(row);
          return row as unknown as T;
        }
        // SELECT automation_rules by id
        if (sql.includes("FROM automation_rules WHERE id")) {
          const id = boundArgs[0] as string;
          const accountId = boundArgs[1] as string;
          const row = automationRules.find((r) => r.id === id && r.account_id === accountId);
          return row ? (row as unknown as T) : null;
        }
        // SELECT contacts by ig_user_id
        if (sql.includes("FROM contacts WHERE ig_user_id")) {
          const igId = boundArgs[0] as string;
          const accountId = boundArgs[1] as string;
          const c = contacts.get(igId);
          return c && (c.account_id ?? "default") === accountId ? (c as unknown as T) : null;
        }
        // SELECT contacts by id
        if (sql.includes("FROM contacts WHERE id")) {
          const id = boundArgs[0] as string;
          const accountId = boundArgs[1] as string;
          for (const c of contacts.values()) {
            if (c.id === id && (c.account_id ?? "default") === accountId) return c as unknown as T;
          }
          return null;
        }
        // Messages RETURNING
        if (sql.includes("INTO messages") && sql.includes("RETURNING")) {
          return {
            id: `msg-${++idCounter}`,
            account_id: boundArgs[0],
            contact_id: boundArgs[1],
            direction: boundArgs[2],
            content: boundArgs[3],
            ig_message_id: boundArgs[4],
            created_at: new Date().toISOString(),
          } as unknown as T;
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        // SELECT automation_rules by event_type
        if (sql.includes("FROM automation_rules") && sql.includes("event_type = ?")) {
          const eventType = boundArgs[0] as string;
          const accountId = boundArgs[1] as string;
          const filtered = automationRules.filter(
            (r) => r.event_type === eventType && r.enabled === 1 && r.account_id === accountId,
          );
          return { results: filtered as unknown as T[] };
        }
        if (sql.includes("FROM automation_rules")) {
          const accountId = boundArgs[0] as string;
          return { results: automationRules.filter((r) => r.account_id === accountId) as unknown as T[] };
        }
        // Keyword rules (empty)
        if (sql.includes("keyword_rules")) {
          return { results: [] };
        }
        return { results: [] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        // UPDATE contacts SET tags
        if (sql.includes("UPDATE contacts SET tags")) {
          const tags = boundArgs[0] as string;
          const id = boundArgs[1] as string;
          const accountId = boundArgs[2] as string;
          for (const c of contacts.values()) {
            if (c.id === id && (c.account_id ?? "default") === accountId) {
              c.tags = tags;
              break;
            }
          }
        }
        // UPDATE contacts SET last_message_at
        if (sql.includes("UPDATE contacts SET last_message_at")) {
          const igId = boundArgs[1] as string;
          const accountId = boundArgs[2] as string;
          const c = contacts.get(igId);
          if (c && (c.account_id ?? "default") === accountId) c.last_message_at = new Date().toISOString();
        }
        return { meta: { changes: 1 } };
      },
    };
  }

  return {
    db: {
      prepare: (sql: string) => createStatement(sql),
      batch: async () => [],
      dump: async () => new ArrayBuffer(0),
      exec: async () => ({ count: 0, duration: 0 }),
    } as unknown as D1Database,
    contacts,
    automationRules,
  };
}

describe("AutomationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("イベント発火時にマッチするルールのアクションを実行する", async () => {
    const mock = createAutomationD1Mock();
    const now = new Date().toISOString();

    // コンタクトを追加
    mock.contacts.set("ig-user-1", {
      id: "c1",
      account_id: "default",
      ig_user_id: "ig-user-1",
      username: "testuser",
      display_name: null,
      tags: "[]",
      score: 0,
      first_seen_at: now,
      last_message_at: now,
    });

    const service = new AutomationService({
      db: mock.db,
      accessToken: "test-token",
      igAccountId: "ig-account",
    });

    // ルール作成: message_received → add_tag "active"
    await service.create({
      name: "Tag active on message",
      eventType: "message_received",
      condition: {},
      actions: [{ type: "add_tag", tag: "active" }],
    });

    // イベント発火
    await service.processEvent("message_received", {
      contactId: "ig-user-1",
      tags: [],
    });

    // タグが追加された
    const contact = mock.contacts.get("ig-user-1");
    expect(contact?.tags).toBe('["active"]');
  });

  it("条件不一致のルールはスキップされる", async () => {
    const mock = createAutomationD1Mock();
    const now = new Date().toISOString();

    mock.contacts.set("ig-user-2", {
      id: "c2",
      account_id: "default",
      ig_user_id: "ig-user-2",
      username: "testuser2",
      display_name: null,
      tags: "[]",
      score: 0,
      first_seen_at: now,
      last_message_at: now,
    });

    const service = new AutomationService({
      db: mock.db,
      accessToken: "test-token",
      igAccountId: "ig-account",
    });

    // ルール作成: message_received + tagEquals: "vip" → add_tag "notified"
    await service.create({
      name: "Notify VIP",
      eventType: "message_received",
      condition: { tagEquals: "vip" },
      actions: [{ type: "add_tag", tag: "notified" }],
    });

    // イベント発火（VIPタグなし）
    await service.processEvent("message_received", {
      contactId: "ig-user-2",
      tags: [],
    });

    // タグは変更されていない
    const contact = mock.contacts.get("ig-user-2");
    expect(contact?.tags).toBe("[]");
  });
});
