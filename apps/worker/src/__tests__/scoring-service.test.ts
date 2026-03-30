/**
 * ScoringService テスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScoringService } from "../scoring/service.js";

function createScoringD1Mock() {
  const scoringRules: Array<Record<string, unknown>> = [];
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
        // INSERT scoring_rules RETURNING
        if (sql.includes("INTO scoring_rules") && sql.includes("RETURNING")) {
          idCounter++;
          const row = {
            id: `sr-${idCounter}`,
            account_id: boundArgs[0],
            event_type: boundArgs[1],
            points: boundArgs[2],
            enabled: 1,
            created_at: new Date().toISOString(),
          };
          scoringRules.push(row);
          return row as unknown as T;
        }
        // SELECT score FROM contacts
        if (sql.includes("SELECT score FROM contacts")) {
          const id = boundArgs[0] as string;
          return { score: contactScores.get(id) ?? 0 } as unknown as T;
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        // SELECT scoring_rules with event_type filter
        if (sql.includes("FROM scoring_rules") && sql.includes("event_type = ?")) {
          const eventType = boundArgs[0] as string;
          const accountId = boundArgs[1] as string;
          const filtered = scoringRules.filter(
            (r) => r.event_type === eventType && r.enabled === 1 && r.account_id === accountId,
          );
          return { results: filtered as unknown as T[] };
        }
        // SELECT all scoring_rules
        if (sql.includes("FROM scoring_rules")) {
          const accountId = boundArgs[0] as string;
          return { results: scoringRules.filter((r) => r.account_id === accountId) as unknown as T[] };
        }
        return { results: [] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        // UPDATE contacts SET score
        if (sql.includes("UPDATE contacts SET score = score + ?")) {
          const points = boundArgs[0] as number;
          const contactId = boundArgs[1] as string;
          const current = contactScores.get(contactId) ?? 0;
          contactScores.set(contactId, current + points);
        }
        // DELETE
        if (sql.includes("DELETE FROM scoring_rules")) {
          const id = boundArgs[0] as string;
          const idx = scoringRules.findIndex((r) => r.id === id);
          if (idx >= 0) {
            scoringRules.splice(idx, 1);
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
    contactScores,
  };
}

describe("ScoringService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ルールに従いスコアを加算する", async () => {
    const mock = createScoringD1Mock();
    const service = new ScoringService(mock.db);

    // ルール作成: message_received で +5点
    await service.createRule({
      eventType: "message_received",
      points: 5,
    });

    // イベント発火
    await service.recordEvent("contact-1", "message_received");

    // スコア確認
    expect(mock.contactScores.get("contact-1")).toBe(5);

    // もう一度発火
    await service.recordEvent("contact-1", "message_received");
    expect(mock.contactScores.get("contact-1")).toBe(10);
  });

  it("ルールがない場合はスコア変更なし", async () => {
    const mock = createScoringD1Mock();
    const service = new ScoringService(mock.db);

    await service.recordEvent("contact-1", "link_clicked");

    expect(mock.contactScores.has("contact-1")).toBe(false);
  });

  it("複数ルールが合算される", async () => {
    const mock = createScoringD1Mock();
    const service = new ScoringService(mock.db);

    await service.createRule({ eventType: "keyword_matched", points: 3 });
    await service.createRule({ eventType: "keyword_matched", points: 7 });

    await service.recordEvent("contact-2", "keyword_matched");
    expect(mock.contactScores.get("contact-2")).toBe(10);
  });
});
