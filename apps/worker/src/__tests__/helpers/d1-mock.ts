/**
 * D1Database のインメモリモック（テスト用）
 *
 * SQLite は使わず、シンプルなキーバリューストアでRateLimiter/Repositoryをテスト
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

/**
 * rate_limit_tokens テーブル用のD1モック
 */
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
        // SELECT
        if (sql.includes("SELECT")) {
          const key = boundArgs[0] as string;
          const row = store.get(key);
          return row ? (row as unknown as T) : null;
        }
        // INSERT ... RETURNING / UPDATE ... RETURNING
        if (sql.includes("RETURNING")) {
          // Handle UPDATE with RETURNING
          if (sql.includes("UPDATE rate_limit_tokens")) {
            const bucketKey = findBucketKey(sql, boundArgs);
            const row = store.get(bucketKey);
            if (!row) return null;

            const nowIso = boundArgs[0] as string;
            const refillIntervalMs = boundArgs[1] as number;
            const maxTokens = boundArgs[2] as number;

            const elapsed =
              (new Date(nowIso).getTime() -
                new Date(row.last_refill_at).getTime());

            const needsRefill = elapsed >= refillIntervalMs;
            const currentTokens = needsRefill ? maxTokens : row.tokens;

            if (currentTokens <= 0 && !needsRefill) return null;

            const newTokens = needsRefill ? maxTokens - 1 : currentTokens - 1;
            row.tokens = newTokens;
            if (needsRefill) {
              row.last_refill_at = nowIso;
            }
            store.set(bucketKey, row);
            return { tokens: newTokens } as unknown as T;
          }
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        return { results: [] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        // INSERT OR IGNORE
        if (sql.includes("INSERT")) {
          const key = boundArgs[0] as string;
          if (store.has(key)) {
            return { meta: { changes: 0 } };
          }
          store.set(key, {
            bucket_key: key,
            tokens: boundArgs[1] as number,
            last_refill_at: boundArgs[2] as string,
          });
          return { meta: { changes: 1 } };
        }
        // UPDATE
        if (sql.includes("UPDATE")) {
          return { meta: { changes: 1 } };
        }
        return { meta: { changes: 0 } };
      },
    };

    return stmt;
  }

  function findBucketKey(sql: string, args: unknown[]): string {
    // In our atomic SQL, bucket_key is the 7th bound param
    // (nowIso, REFILL_INTERVAL_MS, MAX_TOKENS, nowIso, REFILL_INTERVAL_MS, nowIso, bucketKey, nowIso, REFILL_INTERVAL_MS)
    return args[6] as string;
  }

  const mockDb = {
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

  return mockDb;
}

/**
 * 汎用テーブル用のD1モック（keyword_rules, contacts 等）
 */
export function createGenericD1Mock(
  rows: MockRow[] = [],
): D1Database & { _rows: MockRow[] } {
  const mutableRows = [...rows];

  function createStatement(sql: string): MockStatement {
    let boundArgs: unknown[] = [];

    const stmt: MockStatement = {
      bind(...args: unknown[]) {
        boundArgs = args;
        return stmt;
      },
      async first<T>(): Promise<T | null> {
        if (mutableRows.length > 0) {
          return mutableRows[0] as unknown as T;
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        return { results: mutableRows as unknown as T[] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        return { meta: { changes: mutableRows.length > 0 ? 1 : 0 } };
      },
    };

    return stmt;
  }

  const mockDb = {
    prepare: (sql: string) => createStatement(sql),
    batch: async () => [],
    dump: async () => new ArrayBuffer(0),
    exec: async () => ({ count: 0, duration: 0 }),
    _rows: mutableRows,
  } as unknown as D1Database & { _rows: MockRow[] };

  return mockDb;
}
