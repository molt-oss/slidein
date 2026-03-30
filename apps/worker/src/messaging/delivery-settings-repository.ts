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
  constructor(private readonly db: D1Database, private readonly accountId: string = 'default') {}

  async get(): Promise<DeliverySettings> {
    const row = await this.db
      .prepare("SELECT * FROM delivery_settings WHERE account_id = ? LIMIT 1")
      .bind(this.accountId)
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
         WHERE account_id = ?`,
      )
      .bind(startHour, endHour, timezone, this.accountId)
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
 * 次の配信可能時刻を計算（タイムゾーン対応）
 *
 * 指定タイムゾーンでの現在時刻を取得し、
 * 今日の startHour がまだ先ならば今日の startHour、
 * そうでなければ翌日の startHour を UTC ISO 文字列で返す。
 */
export function getNextDeliveryTime(
  settings: DeliverySettings,
  now?: Date,
): string {
  const currentDate = now ?? new Date();

  // 指定タイムゾーンでの現在日付・時刻を取得
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: settings.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hourFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: settings.timezone,
    hour: "numeric",
    hour12: false,
  });

  const currentHour = parseInt(hourFormatter.format(currentDate), 10);
  const [year, month, day] = dateFormatter
    .format(currentDate)
    .split("-")
    .map(Number);

  // 今日の startHour がまだ先か判定
  const needsTomorrow = currentHour >= settings.startHour;

  // 対象日のstartHourをタイムゾーン付きで構築し、UTCへ変換
  // Date.UTC → ターゲットタイムゾーンのオフセットを加味
  const targetDay = needsTomorrow ? day + 1 : day;
  // 一旦 UTC として仮構築
  const tentativeUtc = new Date(
    Date.UTC(year, month - 1, targetDay, settings.startHour, 0, 0, 0),
  );

  // tentativeUtc は「ターゲットTZでの日時をUTCとして置いた値」なので、
  // 実際のUTC = tentativeUtc - TZオフセット
  // TZオフセットを計算: ターゲットTZでの時刻 - UTC の差
  const utcFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const localFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: settings.timezone,
    hour: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // 基準点での TZ オフセット（分）を算出
  const refDate = tentativeUtc;
  const utcParts = utcFormatter.formatToParts(refDate);
  const localParts = localFormatter.formatToParts(refDate);

  const getNum = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

  const utcHour = getNum(utcParts, "hour");
  const localHour = getNum(localParts, "hour");
  const utcDay = getNum(utcParts, "day");
  const localDay = getNum(localParts, "day");

  // オフセット（時間）= local - utc（日跨ぎ考慮）
  let offsetHours = localHour - utcHour + (localDay - utcDay) * 24;
  // -12 ～ +14 の範囲に正規化
  if (offsetHours > 14) offsetHours -= 24;
  if (offsetHours < -12) offsetHours += 24;

  // 実際のUTC時刻 = ターゲットTZでの時刻 - オフセット
  const resultUtc = new Date(tentativeUtc.getTime() - offsetHours * 60 * 60 * 1000);
  return resultUtc.toISOString();
}
