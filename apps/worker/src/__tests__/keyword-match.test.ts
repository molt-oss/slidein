/**
 * P0/P1 テスト: KeywordMatchService.isMatch
 */
import { describe, it, expect } from "vitest";
import { KeywordMatchService } from "../triggers/keyword-match-service.js";
import { createGenericD1Mock } from "./helpers/d1-mock.js";
import type { KeywordRule } from "../triggers/types.js";

/** isMatch は public にしたのでインスタンスから直接呼べる */
function createService() {
  const db = createGenericD1Mock();
  return new KeywordMatchService(db);
}

function makeRule(
  overrides: Partial<KeywordRule> = {},
): KeywordRule {
  return {
    id: "rule-1",
    keyword: "hello",
    matchType: "contains",
    responseText: "Hi there!",
    enabled: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("KeywordMatchService.isMatch", () => {
  const service = createService();

  describe("exact マッチ", () => {
    it("完全一致で true", () => {
      const rule = makeRule({ matchType: "exact", keyword: "hello" });
      expect(service.isMatch("hello", rule)).toBe(true);
    });

    it("大文字小文字を無視", () => {
      const rule = makeRule({ matchType: "exact", keyword: "Hello" });
      expect(service.isMatch("hello", rule)).toBe(true);
    });

    it("部分一致では false", () => {
      const rule = makeRule({ matchType: "exact", keyword: "hello" });
      expect(service.isMatch("hello world", rule)).toBe(false);
    });
  });

  describe("contains マッチ", () => {
    it("部分一致で true", () => {
      const rule = makeRule({ matchType: "contains", keyword: "hello" });
      expect(service.isMatch("say hello world", rule)).toBe(true);
    });

    it("大文字小文字を無視", () => {
      const rule = makeRule({ matchType: "contains", keyword: "HELLO" });
      expect(service.isMatch("say hello world", rule)).toBe(true);
    });

    it("含まれない場合 false", () => {
      const rule = makeRule({ matchType: "contains", keyword: "goodbye" });
      expect(service.isMatch("say hello world", rule)).toBe(false);
    });
  });

  describe("regex マッチ", () => {
    it("正規表現でマッチ", () => {
      const rule = makeRule({ matchType: "regex", keyword: "^hello\\s" });
      expect(service.isMatch("hello world", rule)).toBe(true);
    });

    it("正規表現で不一致", () => {
      const rule = makeRule({ matchType: "regex", keyword: "^goodbye" });
      expect(service.isMatch("hello world", rule)).toBe(false);
    });

    it("不正な正規表現で false（クラッシュしない）", () => {
      const rule = makeRule({ matchType: "regex", keyword: "[invalid" });
      expect(service.isMatch("test", rule)).toBe(false);
    });

    it("100文字超のパターンはスキップ", () => {
      const longPattern = "a".repeat(101);
      const rule = makeRule({ matchType: "regex", keyword: longPattern });
      expect(service.isMatch("aaa", rule)).toBe(false);
    });
  });
});
