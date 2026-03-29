/**
 * AIService テスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIService } from "../ai/service.js";
import type { AIConfig } from "../ai/types.js";
import type { Contact } from "../contacts/types.js";

const mockContact: Contact = {
  id: "c-1",
  igUserId: "ig-123",
  username: "testuser",
  displayName: "Test User",
  tags: ["vip", "buyer"],
  score: 42,
  firstSeenAt: "2025-01-01T00:00:00Z",
  lastMessageAt: new Date().toISOString(),
};

const mockAnthropicConfig: AIConfig = {
  id: "default",
  enabled: true,
  provider: "anthropic",
  apiKeyEncrypted: null,
  model: "claude-sonnet-4-20250514",
  systemPrompt: "You are a shop assistant.",
  knowledgeBase: "We sell shoes. Open 9-5.",
  maxTokens: 200,
  createdAt: "2025-01-01T00:00:00Z",
};

const mockOpenAIConfig: AIConfig = {
  ...mockAnthropicConfig,
  provider: "openai",
  model: "gpt-4o",
};

function createAIConfigD1Mock(config: AIConfig | null = mockAnthropicConfig) {
  function createStatement(sql: string) {
    let boundArgs: unknown[] = [];
    return {
      bind(...args: unknown[]) {
        boundArgs = args;
        return this;
      },
      async first<T>(): Promise<T | null> {
        if (sql.includes("SELECT") && sql.includes("ai_config")) {
          if (!config) return null;
          return {
            id: config.id,
            enabled: config.enabled ? 1 : 0,
            provider: config.provider,
            api_key_encrypted: config.apiKeyEncrypted,
            model: config.model,
            system_prompt: config.systemPrompt,
            knowledge_base: config.knowledgeBase,
            max_tokens: config.maxTokens,
            created_at: config.createdAt,
          } as unknown as T;
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        return { results: [] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
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

describe("AIService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("AI無効時はnullを返す", async () => {
    const disabledConfig = { ...mockAnthropicConfig, enabled: false };
    const db = createAIConfigD1Mock(disabledConfig);
    const service = new AIService({ db, aiApiKey: "test-key" });
    const config = await service.getConfig();
    expect(config).toBeTruthy();
    expect(config!.enabled).toBe(false);
  });

  it("Anthropic APIを正しく呼び出す", async () => {
    const db = createAIConfigD1Mock();
    const service = new AIService({ db, aiApiKey: "test-key" });

    const mockResponse = {
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "Hello! We sell shoes." }],
      }),
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse as unknown as Response,
    );

    const result = await service.generateResponse(
      "What do you sell?",
      mockContact,
      mockAnthropicConfig,
    );

    expect(result).toBe("Hello! We sell shoes.");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "test-key",
          "anthropic-version": "2023-06-01",
        }),
      }),
    );

    // Verify system prompt contains contact info & knowledge base
    const callBody = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    );
    expect(callBody.system).toContain("Test User");
    expect(callBody.system).toContain("vip, buyer");
    expect(callBody.system).toContain("We sell shoes");
    expect(callBody.max_tokens).toBe(200);
  });

  it("OpenAI APIを正しく呼び出す", async () => {
    const db = createAIConfigD1Mock(mockOpenAIConfig);
    const service = new AIService({ db, aiApiKey: "openai-key" });

    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "We have great shoes!" } }],
      }),
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse as unknown as Response,
    );

    const result = await service.generateResponse(
      "Tell me about shoes",
      mockContact,
      mockOpenAIConfig,
    );

    expect(result).toBe("We have great shoes!");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer openai-key",
        }),
      }),
    );
  });

  it("APIキーが未設定の場合はnullを返す", async () => {
    const db = createAIConfigD1Mock();
    const service = new AIService({ db });

    const result = await service.generateResponse(
      "Hello",
      mockContact,
      mockAnthropicConfig,
    );

    expect(result).toBeNull();
  });

  it("APIエラー時はnullを返す", async () => {
    const db = createAIConfigD1Mock();
    const service = new AIService({ db, aiApiKey: "test-key" });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "Rate limited",
    } as unknown as Response);

    const result = await service.generateResponse(
      "Hello",
      mockContact,
      mockAnthropicConfig,
    );

    expect(result).toBeNull();
  });

  it("設定を更新できる", async () => {
    const db = createAIConfigD1Mock();
    const service = new AIService({ db, aiApiKey: "test-key" });

    const updated = await service.updateConfig({ enabled: true });
    expect(updated).toBeTruthy();
  });
});
