/**
 * MCP Server テスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MCPServer } from "../mcp/server.js";

function createMCPD1Mock() {
  const keywordRules: Array<Record<string, unknown>> = [];
  let idCounter = 0;

  function createStatement(sql: string) {
    let boundArgs: unknown[] = [];
    return {
      bind(...args: unknown[]) {
        boundArgs = args;
        return this;
      },
      async first<T>(): Promise<T | null> {
        // ai_config
        if (sql.includes("ai_config")) {
          return {
            id: "default",
            enabled: 0,
            provider: "anthropic",
            api_key_encrypted: null,
            model: "claude-sonnet-4-20250514",
            system_prompt: null,
            knowledge_base: null,
            max_tokens: 500,
            created_at: "2025-01-01",
          } as unknown as T;
        }
        // INSERT keyword_rules RETURNING
        if (sql.includes("INTO keyword_rules") && sql.includes("RETURNING")) {
          idCounter++;
          const row = {
            id: `kr-${idCounter}`,
            keyword: boundArgs[0],
            match_type: boundArgs[1],
            response_text: boundArgs[2],
            enabled: 1,
            created_at: new Date().toISOString(),
          };
          keywordRules.push(row);
          return row as unknown as T;
        }
        // contacts
        if (sql.includes("FROM contacts") && sql.includes("WHERE id")) {
          return {
            id: boundArgs[0],
            ig_user_id: "ig-1",
            username: "test",
            display_name: "Test",
            tags: "[]",
            score: 0,
            first_seen_at: "2025-01-01",
            last_message_at: "2025-01-01",
          } as unknown as T;
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        // keyword_rules
        if (sql.includes("FROM keyword_rules")) {
          return { results: keywordRules as unknown as T[] };
        }
        // contacts
        if (sql.includes("FROM contacts")) {
          return { results: [] };
        }
        // scoring_rules
        if (sql.includes("FROM scoring_rules")) {
          return { results: [] };
        }
        // broadcasts
        if (sql.includes("FROM broadcasts")) {
          return { results: [] };
        }
        // forms
        if (sql.includes("FROM forms")) {
          return { results: [] };
        }
        return { results: [] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        if (sql.includes("DELETE")) {
          const id = boundArgs[0] as string;
          const idx = keywordRules.findIndex((r) => r.id === id);
          if (idx >= 0) {
            keywordRules.splice(idx, 1);
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }
        return { meta: { changes: 1 } };
      },
    };
  }

  return {
    prepare: (sql: string) => createStatement(sql),
    batch: async () => [],
    dump: async () => new ArrayBuffer(0),
    exec: async () => ({ count: 0, duration: 0 }),
  } as unknown as D1Database;
}

describe("MCPServer", () => {
  let server: MCPServer;

  beforeEach(() => {
    vi.clearAllMocks();
    const db = createMCPD1Mock();
    server = new MCPServer({
      db,
      accessToken: "test-token",
      igAccountId: "ig-123",
    });
  });

  it("initializeに応答する", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
    });

    expect(res.result).toEqual(
      expect.objectContaining({
        protocolVersion: "2024-11-05",
        serverInfo: { name: "slidein", version: "0.1.0" },
      }),
    );
  });

  it("initializeでscopeを指定できる", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { scope: "read" },
    });

    const result = res.result as Record<string, unknown>;
    expect(result.scope).toBe("read");
  });

  it("tools/listでツール一覧を返す", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });

    const tools = (res.result as { tools: unknown[] }).tools;
    expect(tools.length).toBeGreaterThan(10);

    const names = tools.map((t: unknown) => (t as { name: string }).name);
    expect(names).toContain("contacts_list");
    expect(names).toContain("keyword_rules_create");
    expect(names).toContain("ai_config_get");
    expect(names).toContain("broadcasts_send");
  });

  it("read scopeではwrite系ツールが一覧に出ない", async () => {
    // Initialize with read scope
    await server.handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { scope: "read" },
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });

    const tools = (res.result as { tools: unknown[] }).tools;
    const names = tools.map((t: unknown) => (t as { name: string }).name);
    expect(names).toContain("contacts_list");
    expect(names).toContain("ai_config_get");
    expect(names).not.toContain("keyword_rules_create");
    expect(names).not.toContain("broadcasts_send");
    expect(names).not.toContain("ai_config_update");
  });

  it("read scopeではwrite系ツールの呼び出しが拒否される", async () => {
    // Initialize with read scope
    await server.handleRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { scope: "read" },
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "broadcasts_send", arguments: { id: "b-1" } },
    });

    expect(res.error).toBeTruthy();
    expect(res.error!.message).toContain("readwrite");
  });

  it("tools/callでcontacts_listを実行できる", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "contacts_list", arguments: {} },
    });

    expect(res.error).toBeUndefined();
    expect(res.result).toBeTruthy();
  });

  it("tools/callでai_config_getを実行できる", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "ai_config_get", arguments: {} },
    });

    expect(res.error).toBeUndefined();
    const content = (res.result as { content: Array<{ text: string }> }).content;
    const data = JSON.parse(content[0].text);
    expect(data.provider).toBe("anthropic");
  });

  it("存在しないツールはエラーを返す", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "nonexistent_tool", arguments: {} },
    });

    expect(res.error).toBeTruthy();
    expect(res.error!.code).toBe(-32602);
  });

  it("存在しないメソッドはエラーを返す", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: 6,
      method: "unknown/method",
    });

    expect(res.error).toBeTruthy();
    expect(res.error!.code).toBe(-32601);
  });

  it("不正なリクエストはエラーを返す", async () => {
    const res = await server.handleRequest({ invalid: true });

    expect(res.error).toBeTruthy();
    expect(res.error!.code).toBe(-32600);
  });
});
