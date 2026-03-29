/**
 * TokenBucket レート制限 — D1 に状態保存
 * 200通/時間を遵守。アトミックなトークン消費で競合状態を防止。
 */

export const MAX_TOKENS = 200;
export const REFILL_INTERVAL_MS = 60 * 60 * 1000; // 1時間

export interface RateLimiterDeps {
  db: D1Database;
}

/**
 * トークンを1つ消費する。消費可能なら true を返す。
 * D1 の単一SQL文でアトミックに処理し、TOCTOU 競合を排除。
 */
export async function consumeToken(
  deps: RateLimiterDeps,
  bucketKey: string,
): Promise<boolean> {
  const { db } = deps;
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. リフィル + 消費をアトミックに試行
  //    last_refill_at から REFILL_INTERVAL_MS 以上経過していればトークンをリセットしてから消費
  const refillResult = await db
    .prepare(
      `UPDATE rate_limit_tokens
       SET tokens = CASE
         WHEN (julianday(?) - julianday(last_refill_at)) * 86400000 >= ?
         THEN ? - 1
         ELSE tokens - 1
       END,
       last_refill_at = CASE
         WHEN (julianday(?) - julianday(last_refill_at)) * 86400000 >= ?
         THEN ?
         ELSE last_refill_at
       END
       WHERE bucket_key = ?
         AND (
           tokens > 0
           OR (julianday(?) - julianday(last_refill_at)) * 86400000 >= ?
         )
       RETURNING tokens`,
    )
    .bind(
      nowIso,
      REFILL_INTERVAL_MS,
      MAX_TOKENS,
      nowIso,
      REFILL_INTERVAL_MS,
      nowIso,
      bucketKey,
      nowIso,
      REFILL_INTERVAL_MS,
    )
    .first<{ tokens: number }>();

  if (refillResult !== null) {
    return true;
  }

  // 2. 行が存在しない場合: 初回バケット作成（1トークン消費済み）
  //    INSERT OR IGNORE で競合回避
  const insertResult = await db
    .prepare(
      `INSERT OR IGNORE INTO rate_limit_tokens (bucket_key, tokens, last_refill_at)
       VALUES (?, ?, ?)`,
    )
    .bind(bucketKey, MAX_TOKENS - 1, nowIso)
    .run();

  if ((insertResult.meta.changes ?? 0) > 0) {
    return true;
  }

  // 3. INSERT も UPDATE も成功しなかった = トークン枯渇
  return false;
}
