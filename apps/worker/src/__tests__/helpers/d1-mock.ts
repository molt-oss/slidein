/**
 * D1Database のインメモリモック（テスト用）
 */

interface MockRow {
  [key: string]: unknown;
}

interface MockQueryResult {
  results: MockRow[];
  meta: { changes: number };
}

export interface MockStatement {
  bind: (...args: unknown[]) => MockStatement;
  first: <T = MockRow>() => Promise<T | null>;
  all: <T = MockRow>() => Promise<{ results: T[] }>;
  run: () => Promise<{ meta: { changes: number } }>;
}

export function createRateLimitD1Mock() {
  const store = new Map<
    string,
    { bucket_key: string; tokens: number; last_refill_at: string }
  >();

  function createStatement(sql: string): MockStatement {
    let boundArgs: unknown[] = [];

    const stmt: MockStatement = {
      bind(...args: unknown[]) {
        boundArgs = args;
        return stmt;
      },
      async first<T>(): Promise<T | null> {
        if (sql.includes("SELECT")) {
          const key = boundArgs[0] as string;
          const row = store.get(key);
          return row ? (row as unknown as T) : null;
        }
        if (sql.includes("RETURNING") && sql.includes("UPDATE rate_limit_tokens")) {
          const bucketKey = boundArgs[6] as string;
          const row = store.get(bucketKey);
          if (!row) return null;

          const nowIso = boundArgs[0] as string;
          const refillIntervalMs = boundArgs[1] as number;
          const maxTokens = boundArgs[2] as number;

          const elapsed = new Date(nowIso).getTime() - new Date(row.last_refill_at).getTime();
          const needsRefill = elapsed >= refillIntervalMs;
          const currentTokens = needsRefill ? maxTokens : row.tokens;

          if (currentTokens <= 0 && !needsRefill) return null;

          row.tokens = needsRefill ? maxTokens - 1 : currentTokens - 1;
          if (needsRefill) row.last_refill_at = nowIso;
          store.set(bucketKey, row);
          return { tokens: row.tokens } as unknown as T;
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        return { results: [] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        if (sql.includes("INSERT")) {
          const key = boundArgs[0] as string;
          if (store.has(key)) return { meta: { changes: 0 } };
          store.set(key, {
            bucket_key: key,
            tokens: boundArgs[1] as number,
            last_refill_at: boundArgs[2] as string,
          });
          return { meta: { changes: 1 } };
        }
        if (sql.includes("UPDATE")) return { meta: { changes: 1 } };
        return { meta: { changes: 0 } };
      },
    };

    return stmt;
  }

  return {
    prepare: (sql: string) => createStatement(sql),
    batch: async (stmts: MockStatement[]) => {
      const results: MockQueryResult[] = [];
      for (const stmt of stmts) {
        const r = await stmt.run();
        results.push({ results: [], meta: r.meta });
      }
      return results;
    },
    dump: async () => new ArrayBuffer(0),
    exec: async () => ({ count: 0, duration: 0 }),
    _store: store,
  } as unknown as D1Database & { _store: typeof store };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getTable(sql: string): string {
  if (sql.includes("keyword_rules")) return "keyword_rules";
  if (sql.includes("contacts")) return "contacts";
  if (sql.includes("accounts")) return "accounts";
  return "generic";
}

function byAccount(rows: MockRow[], accountId?: unknown): MockRow[] {
  if (!accountId) return rows;
  return rows.filter((row) => (row.account_id ?? "default") === accountId);
}

export function createGenericD1Mock(
  rows: MockRow[] = [],
): D1Database & { _rows: MockRow[] } {
  const mutableRows = rows.map((row) => clone(row));

  function createStatement(sql: string): MockStatement {
    let boundArgs: unknown[] = [];

    const stmt: MockStatement = {
      bind(...args: unknown[]) {
        boundArgs = args;
        return stmt;
      },
      async first<T>(): Promise<T | null> {
        const table = getTable(sql);
        let candidates = mutableRows.filter((row) => (row.__table ?? table) === table);

        if (table === "contacts") {
          if (sql.includes("ig_user_id = ? AND account_id = ?")) {
            candidates = candidates.filter(
              (row) => row.ig_user_id === boundArgs[0] && row.account_id === boundArgs[1],
            );
          } else if (sql.includes("id = ? AND account_id = ?")) {
            candidates = candidates.filter(
              (row) => row.id === boundArgs[0] && row.account_id === boundArgs[1],
            );
          }
        }

        if (table === "keyword_rules") {
          if (sql.includes("account_id = ?")) {
            candidates = byAccount(candidates, boundArgs[0]);
          }
          if (sql.includes("enabled = 1")) {
            candidates = candidates.filter((row) => row.enabled === 1);
          }
        }

        if (table === "accounts") {
          if (sql.includes("WHERE id = ?")) {
            candidates = candidates.filter((row) => row.id === boundArgs[0]);
          }
          if (sql.includes("WHERE ig_account_id = ?")) {
            candidates = candidates.filter((row) => row.ig_account_id === boundArgs[0]);
          }
        }

        return candidates.length > 0 ? (clone(candidates[0]) as unknown as T) : null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        const table = getTable(sql);
        let candidates = mutableRows.filter((row) => (row.__table ?? table) === table);

        if (table === "contacts" && sql.includes("account_id = ?")) {
          candidates = byAccount(candidates, boundArgs[0]);
        }
        if (table === "keyword_rules" && sql.includes("account_id = ?")) {
          candidates = byAccount(candidates, boundArgs[0]);
          if (sql.includes("enabled = 1")) {
            candidates = candidates.filter((row) => row.enabled === 1);
          }
        }
        if (table === "accounts" && sql.includes("ORDER BY")) {
          candidates = [...candidates];
        }

        return { results: candidates.map((row) => clone(row)) as unknown as T[] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        const table = getTable(sql);

        if (table === "contacts" && sql.includes("INSERT INTO contacts")) {
          const row = {
            __table: "contacts",
            id: `contact-${mutableRows.filter((r) => r.__table === "contacts").length + 1}`,
            account_id: boundArgs[0],
            ig_user_id: boundArgs[1],
            username: boundArgs[2],
            display_name: boundArgs[3],
            tags: "[]",
            score: 0,
            first_seen_at: boundArgs[4],
            last_message_at: boundArgs[5],
          };
          mutableRows.push(row);
          return { meta: { changes: 1 } };
        }

        return { meta: { changes: 0 } };
      },
    };

    if (sql.includes("RETURNING") && sql.includes("INSERT INTO contacts")) {
      stmt.first = async <T>() => {
        const row = {
          __table: "contacts",
          id: `contact-${mutableRows.filter((r) => r.__table === "contacts").length + 1}`,
          account_id: boundArgs[0],
          ig_user_id: boundArgs[1],
          username: boundArgs[2],
          display_name: boundArgs[3],
          tags: "[]",
          score: 0,
          first_seen_at: boundArgs[4],
          last_message_at: boundArgs[5],
        };
        mutableRows.push(row);
        return clone(row) as unknown as T;
      };
    }

    if (sql.includes("RETURNING") && sql.includes("INSERT INTO keyword_rules")) {
      stmt.first = async <T>() => {
        const row = {
          __table: "keyword_rules",
          id: `rule-${mutableRows.filter((r) => r.__table === "keyword_rules").length + 1}`,
          account_id: boundArgs[0],
          keyword: boundArgs[1],
          match_type: boundArgs[2],
          response_text: boundArgs[3],
          enabled: 1,
          created_at: new Date().toISOString(),
        };
        mutableRows.push(row);
        return clone(row) as unknown as T;
      };
    }

    return stmt;
  }

  return {
    prepare: (sql: string) => createStatement(sql),
    batch: async () => [],
    dump: async () => new ArrayBuffer(0),
    exec: async () => ({ count: 0, duration: 0 }),
    _rows: mutableRows,
  } as unknown as D1Database & { _rows: MockRow[] };
}
