/**
 * FormService テスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@slidein/meta-sdk", async () => {
  const actual =
    await vi.importActual<typeof import("@slidein/meta-sdk")>(
      "@slidein/meta-sdk",
    );
  return {
    ...actual,
    sendTextMessage: vi.fn().mockResolvedValue({
      recipientId: "user-123",
      messageId: "msg-out-1",
    }),
    consumeToken: vi.fn().mockResolvedValue(true),
  };
});

import { sendTextMessage } from "@slidein/meta-sdk";
import { FormService } from "../forms/service.js";

const mockSendTextMessage = vi.mocked(sendTextMessage);

function createFormD1Mock() {
  const forms: Array<Record<string, unknown>> = [];
  const formResponses: Array<Record<string, unknown>> = [];
  const contacts = new Map<string, Record<string, unknown>>();
  let idCounter = 0;

  function createStatement(sql: string) {
    let boundArgs: unknown[] = [];
    return {
      bind(...args: unknown[]) {
        boundArgs = args;
        return this;
      },
      async first<T>(): Promise<T | null> {
        // INSERT forms RETURNING
        if (sql.includes("INTO forms") && sql.includes("RETURNING")) {
          idCounter++;
          const row = {
            id: `f-${idCounter}`,
            name: boundArgs[0],
            fields: boundArgs[1],
            thank_you_message: boundArgs[2],
            created_at: new Date().toISOString(),
          };
          forms.push(row);
          return row as unknown as T;
        }
        // INSERT form_responses RETURNING
        if (sql.includes("INTO form_responses") && sql.includes("RETURNING")) {
          idCounter++;
          const row = {
            id: `fr-${idCounter}`,
            form_id: boundArgs[0],
            contact_id: boundArgs[1],
            responses: "{}",
            current_field_index: 0,
            completed_at: null,
            created_at: new Date().toISOString(),
          };
          formResponses.push(row);
          return row as unknown as T;
        }
        // SELECT forms by id
        if (sql.includes("FROM forms WHERE id")) {
          const id = boundArgs[0] as string;
          const f = forms.find((f) => f.id === id);
          return f ? (f as unknown as T) : null;
        }
        // SELECT active form_responses
        if (sql.includes("FROM form_responses") && sql.includes("completed_at IS NULL")) {
          const contactId = boundArgs[0] as string;
          const active = formResponses.find(
            (r) => r.contact_id === contactId && r.completed_at === null,
          );
          return active ? (active as unknown as T) : null;
        }
        // SELECT contacts by id
        if (sql.includes("FROM contacts WHERE id")) {
          const id = boundArgs[0] as string;
          for (const c of contacts.values()) {
            if (c.id === id) return c as unknown as T;
          }
          return null;
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        if (sql.includes("FROM forms")) {
          return { results: forms as unknown as T[] };
        }
        if (sql.includes("FROM form_responses")) {
          const formId = boundArgs[0] as string;
          const filtered = formResponses.filter((r) => r.form_id === formId);
          return { results: filtered as unknown as T[] };
        }
        return { results: [] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        // UPDATE form_responses
        if (sql.includes("UPDATE form_responses") && sql.includes("responses = ?")) {
          const responses = boundArgs[0] as string;
          const nextIndex = boundArgs[1] as number;
          const id = boundArgs[2] as string;
          const r = formResponses.find((r) => r.id === id);
          if (r) {
            r.responses = responses;
            r.current_field_index = nextIndex;
          }
        }
        // Complete form_response
        if (sql.includes("UPDATE form_responses") && sql.includes("completed_at")) {
          const id = boundArgs[0] as string;
          const r = formResponses.find((r) => r.id === id);
          if (r) {
            r.completed_at = new Date().toISOString();
          }
        }
        // DELETE
        if (sql.includes("DELETE FROM forms")) {
          const id = boundArgs[0] as string;
          const idx = forms.findIndex((f) => f.id === id);
          if (idx >= 0) {
            forms.splice(idx, 1);
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
    forms,
    formResponses,
    contacts,
  };
}

describe("FormService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("質問送信→回答保存→完了フロー", async () => {
    const mock = createFormD1Mock();
    const now = new Date().toISOString();

    mock.contacts.set("ig-user-1", {
      id: "c1",
      ig_user_id: "ig-user-1",
      username: "testuser",
      display_name: null,
      tags: "[]",
      score: 0,
      first_seen_at: now,
      last_message_at: now,
    });

    const service = new FormService({
      db: mock.db,
      accessToken: "test-token",
      igAccountId: "ig-account",
    });

    // フォーム作成
    const form = await service.createForm({
      name: "Survey",
      fields: [
        { label: "What is your name?", type: "text", key: "name" },
        { label: "What is your email?", type: "email", key: "email" },
      ],
      thankYouMessage: "Thanks!",
    });

    // フォーム開始
    await service.startForm(form.id, "c1");

    // 最初の質問が送信された
    expect(mockSendTextMessage).toHaveBeenCalledTimes(1);
    expect(mockSendTextMessage.mock.calls[0][0].messageText).toBe(
      "What is your name?",
    );

    // 回答1
    const processed1 = await service.processAnswer("c1", "John");
    expect(processed1).toBe(true);

    // 2番目の質問が送信された
    expect(mockSendTextMessage).toHaveBeenCalledTimes(2);
    expect(mockSendTextMessage.mock.calls[1][0].messageText).toBe(
      "What is your email?",
    );

    // 回答2
    const processed2 = await service.processAnswer("c1", "john@example.com");
    expect(processed2).toBe(true);

    // 完了メッセージ
    expect(mockSendTextMessage).toHaveBeenCalledTimes(3);
    expect(mockSendTextMessage.mock.calls[2][0].messageText).toBe("Thanks!");

    // 回答データが保存された
    const response = mock.formResponses[0];
    const data = JSON.parse(response.responses as string);
    expect(data.name).toBe("John");
    expect(data.email).toBe("john@example.com");
    expect(response.completed_at).not.toBeNull();
  });

  it("進行中のフォームがない場合はfalseを返す", async () => {
    const mock = createFormD1Mock();
    const service = new FormService({
      db: mock.db,
      accessToken: "test-token",
      igAccountId: "ig-account",
    });

    const result = await service.processAnswer("nonexistent", "answer");
    expect(result).toBe(false);
  });
});
