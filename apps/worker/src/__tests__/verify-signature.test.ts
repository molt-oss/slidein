/**
 * P0 テスト: verifyWebhookSignature
 */
import { describe, it, expect } from "vitest";
import { verifyWebhookSignature } from "@slidein/meta-sdk";

const APP_SECRET = "test-secret-key-12345";

/** テスト用に署名を生成するヘルパー */
async function generateSignature(
  payload: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

describe("verifyWebhookSignature", () => {
  it("正しい署名で true を返す", async () => {
    const payload = JSON.stringify({ test: "data" });
    const signature = await generateSignature(payload, APP_SECRET);
    const result = await verifyWebhookSignature(payload, signature, APP_SECRET);
    expect(result).toBe(true);
  });

  it("不正な署名で false を返す", async () => {
    const payload = JSON.stringify({ test: "data" });
    const signature = "sha256=0000000000000000000000000000000000000000000000000000000000000000";
    const result = await verifyWebhookSignature(payload, signature, APP_SECRET);
    expect(result).toBe(false);
  });

  it("sha256= プレフィックスなしで false を返す", async () => {
    const payload = JSON.stringify({ test: "data" });
    const result = await verifyWebhookSignature(
      payload,
      "invalid-signature",
      APP_SECRET,
    );
    expect(result).toBe(false);
  });

  it("空文字列の署名で false を返す", async () => {
    const payload = JSON.stringify({ test: "data" });
    const result = await verifyWebhookSignature(payload, "", APP_SECRET);
    expect(result).toBe(false);
  });

  it("ペイロード改竄で false を返す", async () => {
    const original = JSON.stringify({ test: "data" });
    const signature = await generateSignature(original, APP_SECRET);
    const tampered = JSON.stringify({ test: "tampered" });
    const result = await verifyWebhookSignature(tampered, signature, APP_SECRET);
    expect(result).toBe(false);
  });
});
