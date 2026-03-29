/**
 * ScenarioService テスト — シナリオ配信の統合フロー
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Meta SDK のモック
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

import { sendTextMessage, consumeToken } from "@slidein/meta-sdk";
import { ScenarioService } from "../scenarios/service.js";
import type {
  ScenarioEnrollment,
  ScenarioWithSteps,
} from "../scenarios/types.js";

/** テスト用のシナリオD1モック */
function createScenarioD1Mock(opts?: {
  contacts?: Map<string, {
    id: string;
    ig_user_id: string;
    username: string | null;
    display_name: string | null;
    tags: string;
    first_seen_at: string;
    last_message_at: string;
  }>;
}) {
  const scenarios = new Map<string, {
    id: string;
    name: string;
    description: string | null;
    trigger_type: string;
    trigger_value: string | null;
    enabled: number;
    created_at: string;
    updated_at: string;
  }>();
  const steps: Array<{
    id: string;
    scenario_id: string;
    step_order: number;
    message_text: string;
    delay_seconds: number;
    condition_tag: string | null;
    created_at: string;
  }> = [];
  const enrollments = new Map<string, {
    id: string;
    contact_id: string;
    scenario_id: string;
    current_step_order: number;
    status: string;
    next_send_at: string | null;
    enrolled_at: string;
    updated_at: string;
  }>();
  const messages: Array<{
    id: string;
    contact_id: string;
    direction: string;
    content: string;
    ig_message_id: string | null;
    created_at: string;
  }> = [];
  const contacts = opts?.contacts ?? new Map();

  let idCounter = 0;
  const nextId = () => `mock-${++idCounter}`;

  function createStatement(sql: string) {
    let boundArgs: unknown[] = [];

    return {
      bind(...args: unknown[]) {
        boundArgs = args;
        return this;
      },
      async first<T>(): Promise<T | null> {
        // Scenarios
        if (sql.includes("FROM scenarios WHERE id")) {
          const id = boundArgs[0] as string;
          const s = scenarios.get(id);
          return s ? (s as unknown as T) : null;
        }
        if (sql.includes("INTO scenarios") && sql.includes("RETURNING")) {
          const id = nextId();
          const row = {
            id,
            name: boundArgs[0] as string,
            description: boundArgs[1] as string | null,
            trigger_type: boundArgs[2] as string,
            trigger_value: boundArgs[3] as string | null,
            enabled: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          scenarios.set(id, row);
          return row as unknown as T;
        }
        if (sql.includes("UPDATE scenarios") && sql.includes("RETURNING")) {
          const id = boundArgs[boundArgs.length - 1] as string;
          const s = scenarios.get(id);
          return s ? (s as unknown as T) : null;
        }
        // Steps
        if (sql.includes("INTO scenario_steps") && sql.includes("RETURNING")) {
          const id = nextId();
          const row = {
            id,
            scenario_id: boundArgs[0] as string,
            step_order: boundArgs[1] as number,
            message_text: boundArgs[2] as string,
            delay_seconds: boundArgs[3] as number,
            condition_tag: boundArgs[4] as string | null,
            created_at: new Date().toISOString(),
          };
          steps.push(row);
          return row as unknown as T;
        }
        // Enrollments
        if (sql.includes("INTO scenario_enrollments") && sql.includes("RETURNING")) {
          const id = nextId();
          const now = new Date().toISOString();
          const row = {
            id,
            contact_id: boundArgs[0] as string,
            scenario_id: boundArgs[1] as string,
            current_step_order: 1,
            status: "active",
            next_send_at: boundArgs[2] as string,
            enrolled_at: now,
            updated_at: now,
          };
          enrollments.set(id, row);
          return row as unknown as T;
        }
        if (
          sql.includes("FROM scenario_enrollments") &&
          sql.includes("contact_id") &&
          sql.includes("status = 'active'")
        ) {
          const contactId = boundArgs[0] as string;
          const scenarioId = boundArgs[1] as string;
          for (const e of enrollments.values()) {
            if (
              e.contact_id === contactId &&
              e.scenario_id === scenarioId &&
              e.status === "active"
            ) {
              return e as unknown as T;
            }
          }
          return null;
        }
        // Contacts by id
        if (sql.includes("FROM contacts WHERE id")) {
          const id = boundArgs[0] as string;
          for (const c of contacts.values()) {
            if (c.id === id) return c as unknown as T;
          }
          return null;
        }
        // Messages
        if (sql.includes("INTO messages") && sql.includes("RETURNING")) {
          const id = nextId();
          const row = {
            id,
            contact_id: boundArgs[0] as string,
            direction: boundArgs[1] as string,
            content: boundArgs[2] as string,
            ig_message_id: boundArgs[3] as string | null,
            created_at: new Date().toISOString(),
          };
          messages.push(row);
          return row as unknown as T;
        }
        return null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        // Steps by scenario_id
        if (sql.includes("FROM scenario_steps WHERE scenario_id")) {
          const scenarioId = boundArgs[0] as string;
          const filtered = steps
            .filter((s) => s.scenario_id === scenarioId)
            .sort((a, b) => a.step_order - b.step_order);
          return { results: filtered as unknown as T[] };
        }
        // Ready enrollments
        if (sql.includes("FROM scenario_enrollments") && sql.includes("next_send_at <=")) {
          const now = boundArgs[0] as string;
          const ready = [...enrollments.values()].filter(
            (e) =>
              e.status === "active" &&
              e.next_send_at !== null &&
              e.next_send_at <= now,
          );
          return { results: ready as unknown as T[] };
        }
        // All scenarios
        if (sql.includes("FROM scenarios ORDER BY")) {
          return {
            results: [...scenarios.values()] as unknown as T[],
          };
        }
        // Enrollments by scenario
        if (sql.includes("FROM scenario_enrollments WHERE scenario_id")) {
          const scenarioId = boundArgs[0] as string;
          const filtered = [...enrollments.values()].filter(
            (e) => e.scenario_id === scenarioId,
          );
          return { results: filtered as unknown as T[] };
        }
        return { results: [] as T[] };
      },
      async run(): Promise<{ meta: { changes: number } }> {
        // Update enrollments
        if (sql.includes("UPDATE scenario_enrollments") && sql.includes("current_step_order")) {
          const nextStep = boundArgs[0] as number;
          const nextSendAt = boundArgs[1] as string;
          const id = boundArgs[2] as string;
          const e = enrollments.get(id);
          if (e) {
            e.current_step_order = nextStep;
            e.next_send_at = nextSendAt;
            e.updated_at = new Date().toISOString();
          }
          return { meta: { changes: 1 } };
        }
        if (sql.includes("UPDATE scenario_enrollments") && sql.includes("completed")) {
          const id = boundArgs[0] as string;
          const e = enrollments.get(id);
          if (e) {
            e.status = "completed";
            e.next_send_at = null;
          }
          return { meta: { changes: 1 } };
        }
        if (sql.includes("UPDATE scenario_enrollments") && sql.includes("cancelled")) {
          const id = boundArgs[0] as string;
          const e = enrollments.get(id);
          if (e) {
            e.status = "cancelled";
            e.next_send_at = null;
          }
          return { meta: { changes: 1 } };
        }
        // Delete steps
        if (sql.includes("DELETE FROM scenario_steps")) {
          return { meta: { changes: 1 } };
        }
        // Delete scenario
        if (sql.includes("DELETE FROM scenarios")) {
          const id = boundArgs[0] as string;
          const deleted = scenarios.delete(id);
          return { meta: { changes: deleted ? 1 : 0 } };
        }
        // Rate limit
        if (sql.includes("rate_limit_tokens")) {
          return { meta: { changes: 1 } };
        }
        // Pending messages
        if (sql.includes("pending_messages")) {
          return { meta: { changes: 1 } };
        }
        return { meta: { changes: 1 } };
      },
    };
  }

  const db = {
    prepare: (sql: string) => createStatement(sql),
    batch: async () => [],
    dump: async () => new ArrayBuffer(0),
    exec: async () => ({ count: 0, duration: 0 }),
    _scenarios: scenarios,
    _steps: steps,
    _enrollments: enrollments,
    _messages: messages,
    _contacts: contacts,
  } as unknown as D1Database & {
    _scenarios: typeof scenarios;
    _steps: typeof steps;
    _enrollments: typeof enrollments;
    _messages: typeof messages;
    _contacts: typeof contacts;
  };

  return db;
}

const SERVICE_DEPS = {
  accessToken: "test-token",
  igAccountId: "ig-account-1",
};

describe("ScenarioService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (consumeToken as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  it("enroll → processReadySteps → メッセージ送信の統合フロー", async () => {
    const contacts = new Map([
      [
        "user-123",
        {
          id: "contact-1",
          ig_user_id: "user-123",
          username: null,
          display_name: null,
          tags: "[]",
          first_seen_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        },
      ],
    ]);
    const db = createScenarioD1Mock({ contacts });
    const service = new ScenarioService({ ...SERVICE_DEPS, db });

    // シナリオ作成
    const scenario = await service.create({
      name: "Welcome Flow",
      triggerType: "keyword",
      triggerValue: "hello",
      steps: [
        { stepOrder: 1, messageText: "Step 1!", delaySeconds: 0 },
        { stepOrder: 2, messageText: "Step 2!", delaySeconds: 0 },
      ],
    });

    expect(scenario.steps).toHaveLength(2);

    // コンタクト登録
    const enrollment = await service.enrollContact(
      "contact-1",
      scenario.id,
    );
    expect(enrollment.status).toBe("active");
    expect(enrollment.currentStepOrder).toBe(1);

    // next_send_atを過去にセット（即時配信テスト）
    const enrollmentEntry = db._enrollments.get(enrollment.id);
    if (enrollmentEntry) {
      enrollmentEntry.next_send_at = new Date(
        Date.now() - 1000,
      ).toISOString();
    }

    // processReadySteps — ステップ1送信
    await service.processReadySteps();

    expect(sendTextMessage).toHaveBeenCalledWith({
      recipientId: "user-123",
      messageText: "Step 1!",
      accessToken: "test-token",
      igAccountId: "ig-account-1",
    });

    // ステップ2に進行済み
    const updatedEnrollment = db._enrollments.get(enrollment.id);
    expect(updatedEnrollment?.current_step_order).toBe(2);

    // next_send_atを過去に再セット
    if (updatedEnrollment) {
      updatedEnrollment.next_send_at = new Date(
        Date.now() - 1000,
      ).toISOString();
    }

    // processReadySteps — ステップ2送信 → 完了
    await service.processReadySteps();

    expect(sendTextMessage).toHaveBeenCalledTimes(2);
    expect(updatedEnrollment?.status).toBe("completed");
  });

  it("条件分岐: タグなしのステップはスキップ", async () => {
    const contacts = new Map([
      [
        "user-456",
        {
          id: "contact-2",
          ig_user_id: "user-456",
          username: null,
          display_name: null,
          tags: "[]", // タグなし
          first_seen_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        },
      ],
    ]);
    const db = createScenarioD1Mock({ contacts });
    const service = new ScenarioService({ ...SERVICE_DEPS, db });

    const scenario = await service.create({
      name: "Conditional Flow",
      triggerType: "api",
      steps: [
        {
          stepOrder: 1,
          messageText: "Only for VIP",
          delaySeconds: 0,
          conditionTag: "vip",
        },
        { stepOrder: 2, messageText: "Everyone gets this", delaySeconds: 0 },
      ],
    });

    const enrollment = await service.enrollContact(
      "contact-2",
      scenario.id,
    );

    // next_send_atを過去にセット
    const entry = db._enrollments.get(enrollment.id);
    if (entry) entry.next_send_at = new Date(Date.now() - 1000).toISOString();

    // ステップ1はcondition_tag=vipだが、コンタクトにvipタグなし → スキップ
    await service.processReadySteps();

    // ステップ1はスキップされ、ステップ2に進行
    expect(sendTextMessage).not.toHaveBeenCalled();
    expect(entry?.current_step_order).toBe(2);
  });

  it("条件分岐: タグありのステップは送信", async () => {
    const contacts = new Map([
      [
        "user-789",
        {
          id: "contact-3",
          ig_user_id: "user-789",
          username: null,
          display_name: null,
          tags: '["vip"]', // VIPタグあり
          first_seen_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        },
      ],
    ]);
    const db = createScenarioD1Mock({ contacts });
    const service = new ScenarioService({ ...SERVICE_DEPS, db });

    const scenario = await service.create({
      name: "VIP Flow",
      triggerType: "api",
      steps: [
        {
          stepOrder: 1,
          messageText: "VIP message",
          delaySeconds: 0,
          conditionTag: "vip",
        },
      ],
    });

    const enrollment = await service.enrollContact(
      "contact-3",
      scenario.id,
    );
    const entry = db._enrollments.get(enrollment.id);
    if (entry) entry.next_send_at = new Date(Date.now() - 1000).toISOString();

    await service.processReadySteps();

    expect(sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({ messageText: "VIP message" }),
    );
    expect(entry?.status).toBe("completed");
  });

  it("24時間ルール: ウィンドウ外の場合はスキップ", async () => {
    const expiredTime = new Date(
      Date.now() - 25 * 60 * 60 * 1000,
    ).toISOString();
    const contacts = new Map([
      [
        "user-expired",
        {
          id: "contact-expired",
          ig_user_id: "user-expired",
          username: null,
          display_name: null,
          tags: "[]",
          first_seen_at: expiredTime,
          last_message_at: expiredTime, // 25時間前
        },
      ],
    ]);
    const db = createScenarioD1Mock({ contacts });
    const service = new ScenarioService({ ...SERVICE_DEPS, db });

    const scenario = await service.create({
      name: "Expired Test",
      triggerType: "api",
      steps: [
        { stepOrder: 1, messageText: "Should not send", delaySeconds: 0 },
      ],
    });

    const enrollment = await service.enrollContact(
      "contact-expired",
      scenario.id,
    );
    const entry = db._enrollments.get(enrollment.id);
    if (entry) entry.next_send_at = new Date(Date.now() - 1000).toISOString();

    await service.processReadySteps();

    // 24時間ルールにより送信されない
    expect(sendTextMessage).not.toHaveBeenCalled();
    // statusはactiveのまま（次のCronで再チェック）
    expect(entry?.status).toBe("active");
  });

  it("全ステップ完了後にstatus=completed", async () => {
    const contacts = new Map([
      [
        "user-complete",
        {
          id: "contact-complete",
          ig_user_id: "user-complete",
          username: null,
          display_name: null,
          tags: "[]",
          first_seen_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        },
      ],
    ]);
    const db = createScenarioD1Mock({ contacts });
    const service = new ScenarioService({ ...SERVICE_DEPS, db });

    const scenario = await service.create({
      name: "Single Step",
      triggerType: "api",
      steps: [
        { stepOrder: 1, messageText: "Only step", delaySeconds: 0 },
      ],
    });

    const enrollment = await service.enrollContact(
      "contact-complete",
      scenario.id,
    );
    const entry = db._enrollments.get(enrollment.id);
    if (entry) entry.next_send_at = new Date(Date.now() - 1000).toISOString();

    await service.processReadySteps();

    expect(sendTextMessage).toHaveBeenCalledTimes(1);
    expect(entry?.status).toBe("completed");
    expect(entry?.next_send_at).toBeNull();
  });
});
