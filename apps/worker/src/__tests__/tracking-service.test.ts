/**
 * TrackingService テスト
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

import { TrackingService } from "../tracking/service.js";

function createTrackingD1Mock() {
  const trackedLinks: Array<Record<string, unknown>> = [];
  const linkClicks: Array<Record<string, unknown>> = [];
  const contacts = new Map<string, Record<string, unknown>>();
  const contactScores = new Map<string, number>();
  let idCounter = 0;

  function createStatement(sql: string) {
    let boundArgs: unknown[] = [];
    return {
      bind(...args: unknown[]) {
        boundArgs = args;
        return this;
      },
      async first<T>(): Promise<T | null> {
        // INSERT tracked_links RETURNING
        if (sql.includes("INTO tracked_links") && sql.includes("RETURNING")) {
          idCounter++;
          const row = {
            id: `tl-${idCounter}`,
            account_id: boundArgs[0],
            original_url: boundArgs[1],
            short_code: boundArgs[2],
            contact_tag: boundArgs[3],
            scenario_id: boundArgs[4],
            click_count: 0,
            created_at: new Date().toISOString(),
          };
          trackedLinks.push(row);
          return row as unknown as T;
        }
        // SELECT tracked_links by short_code
        if (sql.includes("FROM tracked_links WHERE short_code")) {
          const code = boundArgs[0] as string;
          const accountId = boundArgs[1] as string;
          const found = trackedLinks.find((l) => l.short_code === code && l.account_id === accountId);
          return found ? (found as unknown as T) : null;
        }
        // SELECT contacts by ig_user_id
        if (sql.includes("FROM contacts WHERE ig_user_id")) {
          const igId = boundArgs[0] as string;
          const accountId = boundArgs[1] as string;
          const c = contacts.get(igId);
          return c && c.account_id === accountId ? (c as unknown as T) : null;
        }
        // SELECT contacts by id
        if (sql.includes("FROM contacts WHERE id")) {
          const id = boundArgs[0] as string;
          const accountId = boundArgs[1] as string;
          for (const c of contacts.values()) {
            if (c.id === id && c.account_id === accountId) return c as unknown as T;
          }
          return null;
        }
        // SELECT score FROM contacts
        if (sql.includes("SELECT score FROM contacts")) {
          const id = boundArgs[0] as string;
          return { score: contactScores.get(id) ?? 0 } as unknown as T;
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        if (sql.includes("FROM tracked_links")) {
          return { results: trackedLinks as unknown as T[] };
        }
        // scoring_rules (empty by default)
        if (sql.includes("FROM scoring_rules")) {
          return { results: [] };
        }
        return { results: [] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        // INSERT link_clicks
        if (sql.includes("INTO link_clicks")) {
          linkClicks.push({
            tracked_link_id: boundArgs[0],
            contact_id: boundArgs[1],
          });
        }
        // UPDATE click_count
        if (sql.includes("click_count = click_count + 1")) {
          const id = boundArgs[0] as string;
          const link = trackedLinks.find((l) => l.id === id);
          if (link) link.click_count = (link.click_count as number) + 1;
        }
        // UPDATE contacts SET tags
        if (sql.includes("UPDATE contacts SET tags")) {
          const tags = boundArgs[0] as string;
          const id = boundArgs[1] as string;
          for (const c of contacts.values()) {
            if (c.id === id) {
              c.tags = tags;
              break;
            }
          }
        }
        // UPDATE contacts SET last_message_at
        if (sql.includes("UPDATE contacts SET last_message_at")) {
          // no-op for test
        }
        // UPDATE contacts SET score
        if (sql.includes("UPDATE contacts SET score = score + ?")) {
          const pts = boundArgs[0] as number;
          const cid = boundArgs[1] as string;
          contactScores.set(cid, (contactScores.get(cid) ?? 0) + pts);
        }
        // DELETE
        if (sql.includes("DELETE FROM tracked_links")) {
          const id = boundArgs[0] as string;
          const idx = trackedLinks.findIndex((l) => l.id === id);
          if (idx >= 0) {
            trackedLinks.splice(idx, 1);
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
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
    trackedLinks,
    linkClicks,
    contacts,
    contactScores,
  };
}

describe("TrackingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("リンクを作成できる", async () => {
    const mock = createTrackingD1Mock();
    const service = new TrackingService({
      db: mock.db,
      accessToken: "test-token",
      igAccountId: "ig-account",
    });

    const link = await service.createLink({
      originalUrl: "https://example.com",
      contactTag: "promo",
    });

    expect(link.originalUrl).toBe("https://example.com");
    expect(link.contactTag).toBe("promo");
    expect(link.shortCode).toBeTruthy();
    expect(link.clickCount).toBe(0);
  });

  it("クリック記録 → タグ追加", async () => {
    const mock = createTrackingD1Mock();
    const now = new Date().toISOString();

    // コンタクト追加
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

    const service = new TrackingService({
      db: mock.db,
      accessToken: "test-token",
      igAccountId: "ig-account",
    });

    // リンク作成
    const link = await service.createLink({
      originalUrl: "https://example.com",
      contactTag: "clicked",
    });

    // クリック記録
    await service.recordClick(link.shortCode, "ig-user-1");

    // click_count増加
    expect(mock.trackedLinks[0].click_count).toBe(1);

    // link_clicks記録
    expect(mock.linkClicks.length).toBe(1);

    // タグ追加
    const contact = mock.contacts.get("ig-user-1");
    expect(contact?.tags).toBe('["clicked"]');
  });
});
