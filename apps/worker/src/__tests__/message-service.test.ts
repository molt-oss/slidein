/**
 * P0 テスト: MessageService 統合フロー（D1モック）
 *
 * 受信→コンタクト作成→キーワードマッチ→返信の流れをテスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Meta SDK のモック
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
  };
});

import { sendTextMessage } from "@slidein/meta-sdk";
import { MessageService } from "../messaging/service.js";

/**
 * テスト用の簡易D1モック
 * テーブルごとに振る舞いを切り替える
 */
function createIntegrationD1Mock(opts: {
  keywordRules?: Array<{
    id: string;
    keyword: string;
    match_type: string;
    response_text: string;
    enabled: number;
    created_at: string;
  }>;
}) {
  const contacts = new Map<
    string,
    {
      id: string;
      account_id?: string;
      ig_user_id: string;
      username: string | null;
      display_name: string | null;
      tags: string;
      first_seen_at: string;
      last_message_at: string;
    }
  >();
  const messages: Array<{
    id: string;
    contact_id: string;
    direction: string;
    content: string;
    ig_message_id: string | null;
    created_at: string;
  }> = [];
  let msgCounter = 0;

  // Rate limit bucket
  const buckets = new Map<
    string,
    { tokens: number; last_refill_at: string }
  >();

  function createStatement(sql: string) {
    let boundArgs: unknown[] = [];

    return {
      bind(...args: unknown[]) {
        boundArgs = args;
        return this;
      },
      async first<T>(): Promise<T | null> {
        // Contacts
        if (sql.includes("FROM contacts WHERE ig_user_id")) {
          const igId = boundArgs[0] as string;
          const accountId = boundArgs[1] as string;
          const c = contacts.get(igId);
          return c && (c.account_id ?? "default") === accountId ? (c as unknown as T) : null;
        }
        // Contact INSERT RETURNING
        if (sql.includes("INTO contacts") && sql.includes("RETURNING")) {
          const accountId = boundArgs[0] as string;
          const igId = boundArgs[1] as string;
          const now = new Date().toISOString();
          const contact = {
            id: `contact-${igId}`,
            account_id: accountId,
            ig_user_id: igId,
            username: boundArgs[2] as string | null,
            display_name: boundArgs[3] as string | null,
            tags: "[]",
            first_seen_at: now,
            last_message_at: now,
          };
          contacts.set(igId, contact);
          return contact as unknown as T;
        }
        // Rate limiter UPDATE RETURNING
        if (
          sql.includes("UPDATE rate_limit_tokens") &&
          sql.includes("RETURNING")
        ) {
          const bucketKey = boundArgs[6] as string;
          const row = buckets.get(bucketKey);
          if (!row || row.tokens <= 0) return null;
          row.tokens--;
          return { tokens: row.tokens } as unknown as T;
        }
        // Messages RETURNING
        if (sql.includes("INTO messages") && sql.includes("RETURNING")) {
          msgCounter++;
          const msg = {
            id: `msg-${msgCounter}`,
            account_id: boundArgs[0] as string,
            contact_id: boundArgs[1] as string,
            direction: boundArgs[2] as string,
            content: boundArgs[3] as string,
            ig_message_id: boundArgs[4] as string | null,
            created_at: new Date().toISOString(),
          };
          messages.push(msg);
          return msg as unknown as T;
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        // Keyword rules
        if (sql.includes("keyword_rules")) {
          const accountId = boundArgs[0] as string;
          return {
            results: (opts.keywordRules ?? []).map((rule) => ({ account_id: accountId, ...rule })) as unknown as T[],
          };
        }
        // Pending messages
        if (sql.includes("pending_messages")) {
          return { results: [] as T[] };
        }
        return { results: [] as T[] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        // Contact UPDATE last_message_at
        if (sql.includes("UPDATE contacts")) {
          const igId = boundArgs[1] as string;
          const accountId = boundArgs[2] as string;
          const c = contacts.get(igId);
          if (c && (c.account_id ?? "default") === accountId) c.last_message_at = new Date().toISOString();
          return { meta: { changes: 1 } };
        }
        // Rate limit INSERT
        if (sql.includes("INTO rate_limit_tokens")) {
          const key = boundArgs[0] as string;
          if (!buckets.has(key)) {
            buckets.set(key, {
              tokens: (boundArgs[1] as number),
              last_refill_at: boundArgs[2] as string,
            });
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }
        return { meta: { changes: 1 } };
      },
    };
  }

  const db = {
    prepare: (sql: string) => createStatement(sql),
    batch: async () => [],
    dump: async () => new ArrayBuffer(0),
    exec: async () => ({ count: 0, duration: 0 }),
    _contacts: contacts,
    _messages: messages,
    _buckets: buckets,
  } as unknown as D1Database & {
    _contacts: typeof contacts;
    _messages: typeof messages;
    _buckets: typeof buckets;
  };

  return db;
}

describe("MessageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("受信→コンタクト作成→キーワードマッチ→返信の統合フロー", async () => {
    const db = createIntegrationD1Mock({
      keywordRules: [
        {
          id: "rule-1",
          keyword: "hello",
          match_type: "contains",
          response_text: "Welcome!",
          enabled: 1,
          created_at: new Date().toISOString(),
        },
      ],
    });

    const service = new MessageService({
      db,
      accessToken: "test-token",
      igAccountId: "ig-account-1",
    });

    await service.handleIncoming("user-123", "hello world", "mid-1");

    // コンタクトが作成された
    expect(db._contacts.has("user-123")).toBe(true);

    // 受信メッセージがログされた
    expect(db._messages.some((m) => m.direction === "in")).toBe(true);

    // sendTextMessage が呼ばれた
    expect(sendTextMessage).toHaveBeenCalledWith({
      recipientId: "user-123",
      messageText: "Welcome!",
      accessToken: "test-token",
      igAccountId: "ig-account-1",
    });

    // 送信メッセージがログされた
    expect(db._messages.some((m) => m.direction === "out")).toBe(true);
  });

  it("キーワード不一致の場合は返信しない", async () => {
    const db = createIntegrationD1Mock({
      keywordRules: [
        {
          id: "rule-1",
          keyword: "hello",
          match_type: "exact",
          response_text: "Welcome!",
          enabled: 1,
          created_at: new Date().toISOString(),
        },
      ],
    });

    const service = new MessageService({
      db,
      accessToken: "test-token",
      igAccountId: "ig-account-1",
    });

    await service.handleIncoming("user-456", "goodbye", "mid-2");

    // コンタクトは作成される
    expect(db._contacts.has("user-456")).toBe(true);

    // 送信は呼ばれない
    expect(sendTextMessage).not.toHaveBeenCalled();
  });
});
