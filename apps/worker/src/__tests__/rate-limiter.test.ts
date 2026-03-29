/**
 * P0 テスト: consumeToken（レート制限）
 */
import { describe, it, expect } from "vitest";
import { consumeToken, MAX_TOKENS, REFILL_INTERVAL_MS } from "@slidein/meta-sdk";
import { createRateLimitD1Mock } from "./helpers/d1-mock.js";

describe("consumeToken", () => {
  it("初回呼び出しでバケット作成 + トークン消費", async () => {
    const db = createRateLimitD1Mock();
    const result = await consumeToken({ db }, "test-bucket");
    expect(result).toBe(true);
  });

  it("トークン残ありで true を返す", async () => {
    const db = createRateLimitD1Mock();
    // 初回
    await consumeToken({ db }, "test-bucket");
    // 2回目
    const result = await consumeToken({ db }, "test-bucket");
    expect(result).toBe(true);
  });

  it("トークン枯渇で false を返す", async () => {
    const db = createRateLimitD1Mock();
    // 全トークンを消費
    for (let i = 0; i < MAX_TOKENS; i++) {
      const ok = await consumeToken({ db }, "test-bucket");
      expect(ok).toBe(true);
    }
    // 枯渇
    const result = await consumeToken({ db }, "test-bucket");
    expect(result).toBe(false);
  });

  it("リフィル後にトークンが回復する", async () => {
    const db = createRateLimitD1Mock();

    // 全トークン消費
    for (let i = 0; i < MAX_TOKENS; i++) {
      await consumeToken({ db }, "refill-bucket");
    }
    expect(await consumeToken({ db }, "refill-bucket")).toBe(false);

    // last_refill_at を2時間前に巻き戻す
    const row = db._store.get("refill-bucket");
    if (row) {
      row.last_refill_at = new Date(
        Date.now() - REFILL_INTERVAL_MS - 1000,
      ).toISOString();
    }

    // リフィル後は消費可能
    const result = await consumeToken({ db }, "refill-bucket");
    expect(result).toBe(true);
  });
});
