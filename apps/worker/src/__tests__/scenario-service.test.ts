/**
 * ScenarioService テスト — シナリオ配信の統合フロー
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
import { createScenarioD1Mock } from "./helpers/scenario-d1-mock.js";

const SERVICE_DEPS = {
  accessToken: "test-token",
  igAccountId: "ig-account-1",
};

const FIXED_NOW = new Date("2026-01-15T12:00:00Z");

describe("ScenarioService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    vi.clearAllMocks();
    (consumeToken as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
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
