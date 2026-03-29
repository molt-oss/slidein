/**
 * Delivery Settings Repository — 配信時間帯制御
 */
import type { DeliverySettingsRow } from "@slidein/db";

export interface DeliverySettings {
  id: string;
  startHour: number;
  endHour: number;
  timezone: string;
}

function rowToSettings(row: DeliverySettingsRow): DeliverySettings {
  return {
    id: row.id,
    startHour: row.start_hour,
    endHour: row.end_hour,
    timezone: row.timezone,
  };
}

export class DeliverySettingsRepository {
  constructor(private readonly db: D1Database) {}

  async get(): Promise<DeliverySettings> {
    const row = await this.db
      .prepare("SELECT * FROM delivery_settings WHERE id = 'default'")
      .first<DeliverySettingsRow>();
    if (!row) {
      return { id: "default", startHour: 9, endHour: 23, timezone: "Asia/Tokyo" };
    }
    return rowToSettings(row);
  }

  async update(startHour: number, endHour: number, timezone: string): Promise<DeliverySettings> {
    await this.db
      .prepare(
        `UPDATE delivery_settings
         SET start_hour = ?, end_hour = ?, timezone = ?
         WHERE id = 'default'`,
      )
      .bind(startHour, endHour, timezone)
      .run();
    return this.get();
  }
}

/**
 * 現在時刻が配信可能な時間帯内かチェック
 */
export function isWithinDeliveryHours(
  settings: DeliverySettings,
  now?: Date,
): boolean {
  const currentDate = now ?? new Date();

  // タイムゾーン対応: 指定タイムゾーンでの時刻を取得
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: settings.timezone,
  });
  const currentHour = parseInt(formatter.format(currentDate), 10);

  return currentHour >= settings.startHour && currentHour < settings.endHour;
}

/**
 * 次の配信可能時刻（翌日のstartHour）を計算
 */
export function getNextDeliveryTime(
  settings: DeliverySettings,
  now?: Date,
): string {
  const currentDate = now ?? new Date();
  // 簡易実装: 翌日のstartHour（UTC変換はタイムゾーンに依存）
  const tomorrow = new Date(currentDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(settings.startHour, 0, 0, 0);
  return tomorrow.toISOString();
}
