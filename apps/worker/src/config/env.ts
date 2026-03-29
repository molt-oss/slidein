/**
 * Cloudflare Workers 環境変数・バインディング型定義
 */

export interface Env {
  DB: D1Database;
  META_APP_SECRET: string;
  META_ACCESS_TOKEN: string;
  META_VERIFY_TOKEN: string;
  IG_ACCOUNT_ID: string;
}
