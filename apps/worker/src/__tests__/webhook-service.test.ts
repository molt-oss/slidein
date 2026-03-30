/**
 * WebhookService テスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebhookService } from "../webhooks/service.js";

// fetch モック
const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
vi.stubGlobal("fetch", mockFetch);

// crypto.subtle モック
vi.stubGlobal("crypto", {
  subtle: {
    importKey: vi.fn().mockResolvedValue("mock-key"),
    sign: vi.fn().mockResolvedValue(new Uint8Array([0xab, 0xcd]).buffer),
  },
});

function createWebhookD1Mock() {
  const endpoints: Array<Record<string, unknown>> = [];
  let idCounter = 0;

  function createStatement(sql: string) {
    let boundArgs: unknown[] = [];
    return {
      bind(...args: unknown[]) {
        boundArgs = args;
        return this;
      },
      async first<T>(): Promise<T | null> {
        if (sql.includes("INTO webhook_endpoints") && sql.includes("RETURNING")) {
          idCounter++;
          const row = {
            id: `we-${idCounter}`,
            account_id: boundArgs[0],
            url: boundArgs[1],
            events: boundArgs[2],
            secret: boundArgs[3],
            enabled: 1,
            created_at: new Date().toISOString(),
          };
          endpoints.push(row);
          return row as unknown as T;
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        if (sql.includes("FROM webhook_endpoints")) {
          const accountId = boundArgs[0] as string;
          const scoped = endpoints.filter((e) => e.account_id === accountId);
          const filtered = sql.includes("enabled = 1")
            ? scoped.filter((e) => e.enabled === 1)
            : scoped;
          return { results: filtered as unknown as T[] };
        }
        return { results: [] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        if (sql.includes("DELETE FROM webhook_endpoints")) {
          const id = boundArgs[0] as string;
          const idx = endpoints.findIndex((e) => e.id === id);
          if (idx >= 0) {
            endpoints.splice(idx, 1);
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
    endpoints,
  };
}

describe("WebhookService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("イベント通知でマッチするエンドポイントにPOSTする", async () => {
    const mock = createWebhookD1Mock();
    const service = new WebhookService(mock.db);

    await service.create({
      url: "https://example.com/hook",
      events: ["message_received", "keyword_matched"],
      secret: "test-secret-key",
    });

    await service.notifyEvent("message_received", {
      contactId: "c1",
      message: "hello",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://example.com/hook");
    expect(opts.method).toBe("POST");
    expect(opts.headers["X-Signature-256"]).toMatch(/^sha256=/);

    const body = JSON.parse(opts.body);
    expect(body.event).toBe("message_received");
    expect(body.data.contactId).toBe("c1");
  });

  it("マッチしないイベントではPOSTしない", async () => {
    const mock = createWebhookD1Mock();
    const service = new WebhookService(mock.db);

    await service.create({
      url: "https://example.com/hook",
      events: ["keyword_matched"],
      secret: "test-secret-key",
    });

    await service.notifyEvent("message_received", { contactId: "c1" });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
