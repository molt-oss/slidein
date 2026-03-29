/**
 * BroadcastService テスト
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

import { sendTextMessage, consumeToken } from "@slidein/meta-sdk";
import { BroadcastService } from "../broadcasts/service.js";

function createBroadcastD1Mock() {
  const broadcasts = new Map<string, Record<string, unknown>>();
  const contacts: Array<Record<string, unknown>> = [];
  let idCounter = 0;

  function createStatement(sql: string) {
    let boundArgs: unknown[] = [];
    return {
      bind(...args: unknown[]) {
        boundArgs = args;
        return this;
      },
      async first<T>(): Promise<T | null> {
        // INSERT broadcasts RETURNING
        if (sql.includes("INTO broadcasts") && sql.includes("RETURNING")) {
          idCounter++;
          const id = `bc-${idCounter}`;
          const row = {
            id,
            title: boundArgs[0],
            message_text: boundArgs[1],
            target_type: boundArgs[2],
            target_value: boundArgs[3],
            status: boundArgs[4],
            scheduled_at: boundArgs[5],
            sent_count: 0,
            failed_count: 0,
            created_at: new Date().toISOString(),
          };
          broadcasts.set(id, row);
          return row as unknown as T;
        }
        // SELECT broadcast by id
        if (sql.includes("FROM broadcasts WHERE id")) {
          const id = boundArgs[0] as string;
          const row = broadcasts.get(id);
          return row ? (row as unknown as T) : null;
        }
        // Messages RETURNING
        if (sql.includes("INTO messages") && sql.includes("RETURNING")) {
          return {
            id: `msg-${++idCounter}`,
            contact_id: boundArgs[0],
            direction: boundArgs[1],
            content: boundArgs[2],
            ig_message_id: boundArgs[3],
            created_at: new Date().toISOString(),
          } as unknown as T;
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        // SELECT contacts
        if (sql.includes("FROM contacts")) {
          return { results: contacts as unknown as T[] };
        }
        // SELECT broadcasts
        if (sql.includes("FROM broadcasts")) {
          return { results: [...broadcasts.values()] as unknown as T[] };
        }
        return { results: [] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        // UPDATE broadcasts
        if (sql.includes("UPDATE broadcasts SET status")) {
          const id = boundArgs[1] as string;
          const row = broadcasts.get(id);
          if (row) row.status = boundArgs[0];
        }
        if (sql.includes("sent_count = sent_count + 1")) {
          const id = boundArgs[0] as string;
          const row = broadcasts.get(id);
          if (row) row.sent_count = (row.sent_count as number) + 1;
        }
        if (sql.includes("failed_count = failed_count + 1")) {
          const id = boundArgs[0] as string;
          const row = broadcasts.get(id);
          if (row) row.failed_count = (row.failed_count as number) + 1;
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
    broadcasts,
  };
}

describe("BroadcastService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("全コンタクトにブロードキャスト送信", async () => {
    const mock = createBroadcastD1Mock();
    const now = new Date().toISOString();

    // 2人のコンタクトを追加
    mock.contacts.push(
      { id: "c1", ig_user_id: "ig1", username: "user1", display_name: null, tags: "[]", score: 0, first_seen_at: now, last_message_at: now },
      { id: "c2", ig_user_id: "ig2", username: "user2", display_name: null, tags: "[]", score: 0, first_seen_at: now, last_message_at: now },
    );

    const service = new BroadcastService({
      db: mock.db,
      accessToken: "test-token",
      igAccountId: "ig-account",
    });

    // ブロードキャスト作成
    const bc = await service.create({
      title: "Test Broadcast",
      messageText: "Hello everyone!",
      targetType: "all",
    });
    expect(bc.status).toBe("draft");

    // 送信
    await service.send(bc.id);

    // sendTextMessage が2回呼ばれた
    expect(sendTextMessage).toHaveBeenCalledTimes(2);
    expect(consumeToken).toHaveBeenCalledTimes(2);
  });

  it("タグフィルターでブロードキャスト送信", async () => {
    const mock = createBroadcastD1Mock();
    const now = new Date().toISOString();

    mock.contacts.push(
      { id: "c1", ig_user_id: "ig1", username: "user1", display_name: null, tags: '["vip"]', score: 0, first_seen_at: now, last_message_at: now },
      { id: "c2", ig_user_id: "ig2", username: "user2", display_name: null, tags: '[]', score: 0, first_seen_at: now, last_message_at: now },
    );

    const service = new BroadcastService({
      db: mock.db,
      accessToken: "test-token",
      igAccountId: "ig-account",
    });

    const bc = await service.create({
      title: "VIP Broadcast",
      messageText: "VIP only!",
      targetType: "tag",
      targetValue: "vip",
    });

    await service.send(bc.id);

    // VIPタグのあるコンタクト1人のみに送信
    expect(sendTextMessage).toHaveBeenCalledTimes(1);
    expect(sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: "ig1" }),
    );
  });
});
