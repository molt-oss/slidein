/**
 * Bearer Token Auth Middleware — timing-safe comparison
 */
import type { MiddlewareHandler } from "hono";
import { structuredLog } from "@slidein/shared";
import type { Env } from "../config/env.js";

/**
 * Constant-time string comparison using HMAC to prevent timing attacks.
 * Uses Web Crypto API (available in Workers) instead of node:crypto.
 */
async function timingSafeCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode("timing-safe-key");
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign("HMAC", key, encoder.encode(a)),
    crypto.subtle.sign("HMAC", key, encoder.encode(b)),
  ]);
  // Compare HMAC outputs — constant time for equal-length buffers
  const viewA = new Uint8Array(sigA);
  const viewB = new Uint8Array(sigB);
  if (viewA.byteLength !== viewB.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < viewA.byteLength; i++) {
    diff |= viewA[i] ^ viewB[i];
  }
  return diff === 0;
}

export function bearerAuth(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");
    const expectedToken = c.env.ADMIN_API_KEY;

    if (!expectedToken) {
      structuredLog("error", "ADMIN_API_KEY is not configured");
      return c.json({ error: "Server misconfigured" }, 500);
    }

    if (!authHeader) {
      structuredLog("warn", "Unauthorized API request", { path: c.req.path });
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Timing-safe comparison to prevent timing side-channel attacks
    const isEqual = await timingSafeCompare(authHeader, `Bearer ${expectedToken}`);
    if (!isEqual) {
      structuredLog("warn", "Unauthorized API request", { path: c.req.path });
      return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
  };
}
