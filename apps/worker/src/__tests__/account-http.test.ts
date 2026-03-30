import { describe, expect, it } from "vitest";
import { getAccountIdFromRequest } from "../accounts/http.js";

describe("getAccountIdFromRequest", () => {
  function createContext(headers: Record<string, string> = {}, query: Record<string, string> = {}) {
    return {
      req: {
        header: (name: string) => headers[name] ?? headers[name.toLowerCase()] ?? undefined,
        query: (name: string) => query[name] ?? undefined,
      },
    };
  }

  it("ヘッダーが最優先", () => {
    const c = createContext({ "X-Account-Id": "header-account" }, { accountId: "query-account" });
    expect(getAccountIdFromRequest(c as never)).toBe("header-account");
  });

  it("ヘッダーがなければクエリを使う", () => {
    const c = createContext({}, { accountId: "query-account" });
    expect(getAccountIdFromRequest(c as never)).toBe("query-account");
  });

  it("どちらもなければ default", () => {
    const c = createContext();
    expect(getAccountIdFromRequest(c as never)).toBe("default");
  });
});
