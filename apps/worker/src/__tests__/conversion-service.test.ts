/**
 * ConversionService テスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConversionService } from "../conversions/service.js";

function createConversionD1Mock() {
  const goals: Array<Record<string, unknown>> = [];
  const conversions: Array<Record<string, unknown>> = [];
  const contacts: Array<Record<string, unknown>> = [
    { id: "c1", ig_user_id: "ig-1", username: null, display_name: null, tags: "[]", score: 0, first_seen_at: "2026-01-01T00:00:00Z", last_message_at: "2026-01-01T00:00:00Z" },
    { id: "c2", ig_user_id: "ig-2", username: null, display_name: null, tags: "[]", score: 0, first_seen_at: "2026-01-01T00:00:00Z", last_message_at: "2026-01-01T00:00:00Z" },
    { id: "c3", ig_user_id: "ig-3", username: null, display_name: null, tags: "[]", score: 0, first_seen_at: "2026-01-01T00:00:00Z", last_message_at: "2026-01-01T00:00:00Z" },
  ];
  let idCounter = 0;

  function createStatement(sql: string) {
    let boundArgs: unknown[] = [];
    return {
      bind(...args: unknown[]) {
        boundArgs = args;
        return this;
      },
      async first<T>(): Promise<T | null> {
        // INSERT conversion_goals RETURNING
        if (sql.includes("INTO conversion_goals") && sql.includes("RETURNING")) {
          idCounter++;
          const row = {
            id: `cg-${idCounter}`,
            name: boundArgs[0],
            event_type: boundArgs[1],
            target_value: boundArgs[2],
            created_at: new Date().toISOString(),
          };
          goals.push(row);
          return row as unknown as T;
        }
        // INSERT conversions RETURNING
        if (sql.includes("INTO conversions") && sql.includes("RETURNING")) {
          idCounter++;
          const row = {
            id: `cv-${idCounter}`,
            goal_id: boundArgs[0],
            contact_id: boundArgs[1],
            converted_at: new Date().toISOString(),
          };
          conversions.push(row);
          return row as unknown as T;
        }
        // SELECT conversion_goals by id
        if (sql.includes("FROM conversion_goals WHERE id")) {
          const id = boundArgs[0] as string;
          const g = goals.find((g) => g.id === id);
          return g ? (g as unknown as T) : null;
        }
        // COUNT conversions by goal
        if (sql.includes("COUNT(*)") && sql.includes("FROM conversions")) {
          const goalId = boundArgs[0] as string;
          const cnt = conversions.filter((c) => c.goal_id === goalId).length;
          return { cnt } as unknown as T;
        }
        // COUNT DISTINCT contacts by goal
        if (sql.includes("COUNT(DISTINCT") && sql.includes("FROM conversions")) {
          const goalId = boundArgs[0] as string;
          const unique = new Set(
            conversions.filter((c) => c.goal_id === goalId).map((c) => c.contact_id),
          );
          return { cnt: unique.size } as unknown as T;
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        if (sql.includes("FROM conversion_goals")) {
          return { results: goals as unknown as T[] };
        }
        if (sql.includes("FROM contacts")) {
          return { results: contacts as unknown as T[] };
        }
        return { results: [] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        if (sql.includes("DELETE FROM conversion_goals")) {
          const id = boundArgs[0] as string;
          const idx = goals.findIndex((g) => g.id === id);
          if (idx >= 0) {
            goals.splice(idx, 1);
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
    goals,
    conversions,
  };
}

describe("ConversionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("CV記録してレポートを生成できる", async () => {
    const mock = createConversionD1Mock();
    const service = new ConversionService(mock.db);

    // ゴール作成
    const goal = await service.createGoal({
      name: "Purchase",
      eventType: "link_clicked",
    });

    // CV記録
    await service.recordConversion(goal.id, "c1");
    await service.recordConversion(goal.id, "c2");
    await service.recordConversion(goal.id, "c1"); // 重複コンタクト

    // レポート
    const report = await service.getReport(goal.id);
    expect(report).not.toBeNull();
    expect(report!.totalConversions).toBe(3);
    expect(report!.uniqueContacts).toBe(2);
    expect(report!.totalContacts).toBe(3);
    expect(report!.cvr).toBeCloseTo(66.67, 0);
  });

  it("存在しないゴールのレポートはnull", async () => {
    const mock = createConversionD1Mock();
    const service = new ConversionService(mock.db);

    const report = await service.getReport("nonexistent");
    expect(report).toBeNull();
  });
});
