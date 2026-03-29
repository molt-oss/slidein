/**
 * TokenBucket レート制限 — D1 に状態保存
 * 200通/時間を遵守
 */

const MAX_TOKENS = 200;
const REFILL_INTERVAL_MS = 60 * 60 * 1000; // 1時間

export interface RateLimiterDeps {
  db: D1Database;
}

interface TokenRow {
  tokens: number;
  last_refill_at: string;
}

/**
 * トークンを1つ消費する。消費可能なら true を返す。
 */
export async function consumeToken(
  deps: RateLimiterDeps,
  bucketKey: string,
): Promise<boolean> {
  const { db } = deps;

  // バケットを取得 or 初期化
  const row = await db
    .prepare(
      "SELECT tokens, last_refill_at FROM rate_limit_tokens WHERE bucket_key = ?",
    )
    .bind(bucketKey)
    .first<TokenRow>();

  const now = new Date();

  if (!row) {
    // 初回: バケット作成（1トークン消費済み）
    await db
      .prepare(
        "INSERT INTO rate_limit_tokens (bucket_key, tokens, last_refill_at) VALUES (?, ?, ?)",
      )
      .bind(bucketKey, MAX_TOKENS - 1, now.toISOString())
      .run();
    return true;
  }

  const lastRefill = new Date(row.last_refill_at);
  const elapsed = now.getTime() - lastRefill.getTime();

  let currentTokens = row.tokens;
  let lastRefillAt = row.last_refill_at;

  // リフィル判定
  if (elapsed >= REFILL_INTERVAL_MS) {
    currentTokens = MAX_TOKENS;
    lastRefillAt = now.toISOString();
  }

  if (currentTokens <= 0) {
    return false;
  }

  // トークン消費
  await db
    .prepare(
      "UPDATE rate_limit_tokens SET tokens = ?, last_refill_at = ? WHERE bucket_key = ?",
    )
    .bind(currentTokens - 1, lastRefillAt, bucketKey)
    .run();

  return true;
}
