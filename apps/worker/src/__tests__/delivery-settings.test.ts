/**
 * 配信時間帯制御テスト
 */
import { describe, it, expect } from "vitest";
import {
  isWithinDeliveryHours,
  type DeliverySettings,
} from "../messaging/delivery-settings-repository.js";

describe("isWithinDeliveryHours", () => {
  const settings: DeliverySettings = {
    id: "default",
    startHour: 9,
    endHour: 23,
    timezone: "Asia/Tokyo",
  };

  it("配信時間内ならtrue", () => {
    // 2026-03-29 14:00 JST = 05:00 UTC
    const date = new Date("2026-03-29T05:00:00Z");
    expect(isWithinDeliveryHours(settings, date)).toBe(true);
  });

  it("配信時間外（深夜）ならfalse", () => {
    // 2026-03-29 02:00 JST = 2026-03-28 17:00 UTC
    const date = new Date("2026-03-28T17:00:00Z");
    expect(isWithinDeliveryHours(settings, date)).toBe(false);
  });

  it("開始時刻ちょうどはtrue", () => {
    // 2026-03-29 09:00 JST = 00:00 UTC
    const date = new Date("2026-03-29T00:00:00Z");
    expect(isWithinDeliveryHours(settings, date)).toBe(true);
  });

  it("終了時刻ちょうどはfalse", () => {
    // 2026-03-29 23:00 JST = 14:00 UTC
    const date = new Date("2026-03-29T14:00:00Z");
    expect(isWithinDeliveryHours(settings, date)).toBe(false);
  });

  it("UTCタイムゾーンでも動作する", () => {
    const utcSettings: DeliverySettings = {
      id: "default",
      startHour: 8,
      endHour: 20,
      timezone: "UTC",
    };
    // 10:00 UTC
    const date = new Date("2026-03-29T10:00:00Z");
    expect(isWithinDeliveryHours(utcSettings, date)).toBe(true);

    // 22:00 UTC
    const late = new Date("2026-03-29T22:00:00Z");
    expect(isWithinDeliveryHours(utcSettings, late)).toBe(false);
  });
});
