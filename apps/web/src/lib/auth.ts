/**
 * Auth utilities — ADMIN_PASSWORD ベースのセッション管理
 *
 * HMAC-SHA256 でセッショントークンを生成・検証する。
 * トークン形式: <expiry_timestamp_hex>.<hmac_hex>
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD environment variable is not set");
  }
  return password;
}

/** HMAC-SHA256 署名を生成 */
function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

/** セッショントークンを生成 */
export function createSessionToken(): string {
  const secret = getSecret();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = expiresAt.toString(16);
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

/** セッショントークンを検証 */
export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;

  // 署名検証（timing-safe）
  const expected = sign(payload, secret);
  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return false;
    if (!timingSafeEqual(sigBuf, expBuf)) return false;
  } catch {
    return false;
  }

  // 有効期限チェック
  const expiresAt = parseInt(payload, 16);
  if (isNaN(expiresAt)) return false;
  if (Math.floor(Date.now() / 1000) > expiresAt) return false;

  return true;
}

/** セッション cookie の max-age（秒） */
export const SESSION_COOKIE_MAX_AGE = SESSION_MAX_AGE_SECONDS;
