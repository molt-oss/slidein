/**
 * アプリケーション定数 — Config 層
 *
 * ハードコードされた値をここに集約。
 * 環境変数は env.ts で型定義。
 */

/** Meta Graph API */
export const META_API = {
  /** Graph API ベースURL */
  BASE_URL: "https://graph.instagram.com/v21.0",
} as const;

/** レート制限 */
export const RATE_LIMIT = {
  /** 1時間あたりの最大送信数 */
  MAX_TOKENS: 200,
  /** リフィル間隔（ミリ秒） */
  REFILL_INTERVAL_MS: 60 * 60 * 1000,
} as const;

/** メッセージング */
export const MESSAGING = {
  /** 24時間ルール（ミリ秒） */
  TWENTY_FOUR_HOURS_MS: 24 * 60 * 60 * 1000,
  /** Instagram DM テキスト最大文字数 */
  MAX_DM_TEXT_LENGTH: 1000,
} as const;

/** キーワードルール */
export const KEYWORD_RULE = {
  /** キーワード最大文字数 */
  MAX_KEYWORD_LENGTH: 100,
  /** 応答テキスト最大文字数 */
  MAX_RESPONSE_TEXT_LENGTH: 2000,
  /** 正規表現パターン最大文字数 */
  MAX_REGEX_LENGTH: 100,
} as const;

/** Cron ジョブ */
export const CRON = {
  /** 未送信メッセージ取得件数上限 */
  PENDING_BATCH_SIZE: 10,
} as const;
